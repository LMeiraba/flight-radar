#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <winsock2.h>
#include <ws2tcpip.h>
#include <sys/stat.h>
#define PORT 8080
#define BUFFER_SIZE 8192
#define MAX_HEADERS 50
struct HTTP_Header {
    char *key;
    char *value;
};

struct HTTP_Request {
    char *method;     
    char *path;        
    char *query;       
    char *version;     
    struct HTTP_Header headers[MAX_HEADERS];
    int header_count;
    char *body;
};
void parse_request(char *raw_buffer, struct HTTP_Request *req) {
    memset(req, 0, sizeof(struct HTTP_Request));

    // 1. Separate Body from Headers
    char *body_start = strstr(raw_buffer, "\r\n\r\n");
    if (body_start) {
        req->body = body_start + 4;
        *body_start = '\0';
    }

    // 2. Parse First Line
    char *line = strtok(raw_buffer, "\r\n");
    if (line) {
        req->method = strtok(line, " ");
        char *full_path = strtok(NULL, " "); // This might contain '?'
        req->version = strtok(NULL, " ");

        // --- QUERY PARSING LOGIC ---
        if (full_path) {
            char *question_mark = strchr(full_path, '?');
            if (question_mark) {
                *question_mark = '\0'; // Split the string here
                req->path = full_path; // The part before '?'
                req->query = question_mark + 1; // The part after '?'
            } else {
                req->path = full_path;
                req->query = NULL;
            }
        }
    }

    // 3. Parse Headers
    while ((line = strtok(NULL, "\r\n")) != NULL) {
        if (req->header_count >= MAX_HEADERS) break;
        char *colon = strchr(line, ':');
        if (colon) {
            *colon = '\0';
            req->headers[req->header_count].key = line;
            char *val = colon + 1;
            while (*val == ' ') val++;
            req->headers[req->header_count].value = val;
            req->header_count++;
        }
    }
}

void print_request_details(struct HTTP_Request *req) {
    printf("\n--- REQUEST RECEIVED ---\n");
    printf("Method: %s\n", req->method);
    printf("Path:   %s\n", req->path);
    printf("Query:  %s\n", req->query ? req->query : "(none)"); // Print Query
    printf("Headers: %d\n", req->header_count);
    printf("------------------------\n");
}

const char *get_mime_type(const char *filename) {
    const char *dot = strrchr(filename, '.');
    if (!dot) return "text/plain";
    if (strcmp(dot, ".html") == 0) return "text/html";
    if (strcmp(dot, ".css")  == 0) return "text/css";
    if (strcmp(dot, ".js")   == 0) return "application/javascript";
    if (strcmp(dot, ".png")  == 0) return "image/png";
    if (strcmp(dot, ".jpg")  == 0) return "image/jpeg";
    if (strcmp(dot, ".gif")  == 0) return "image/gif";
    if (strcmp(dot, ".pdf")  == 0) return "application/pdf";
    return "text/plain";
}

int file_exists(const char *filename) {
    struct stat buffer;
    return (stat(filename, &buffer) == 0);
}

void get_final_path(char *request_path, char *final_path) {
    if (strcmp(request_path, "/") == 0) {
        strcpy(final_path, "index.html");
        return;
    }
    char safe_path[256];
    strcpy(safe_path, request_path + 1);

    if (file_exists(safe_path)) {
        strcpy(final_path, safe_path);
        return;
    }
    char html_path[256];
    sprintf(html_path, "%s.html", safe_path);
    if (file_exists(html_path)) {
        strcpy(final_path, html_path);
        return;
    }
    final_path[0] = '\0';
}

void send_file(SOCKET client_socket, const char *path) {
    FILE *file = fopen(path, "rb");
    if (!file) return;

    fseek(file, 0, SEEK_END);
    long fsize = ftell(file);
    fseek(file, 0, SEEK_SET);

    char header[BUFFER_SIZE];
    snprintf(header, sizeof(header),
        "HTTP/1.1 200 OK\r\n"
        "Content-Type: %s\r\n"
        "Content-Length: %ld\r\n"
        "\r\n", get_mime_type(path), fsize);
    
    send(client_socket, header, (int)strlen(header), 0);

    char file_buffer[BUFFER_SIZE];
    size_t bytes_read;
    while ((bytes_read = fread(file_buffer, 1, sizeof(file_buffer), file)) > 0) {
        send(client_socket, file_buffer, (int)bytes_read, 0);
    }
    fclose(file);
}

void send_404(SOCKET client_socket) {
    char *resp = "HTTP/1.1 404 Not Found\r\nContent-Type: text/plain\r\n\r\n404 Not Found";
    send(client_socket, resp, (int)strlen(resp), 0);
}
int main() {
    WSADATA wsa;
    SOCKET server_fd, new_socket;
    struct sockaddr_in address;
    int addrlen = sizeof(address);
    char buffer[BUFFER_SIZE] = {0};

    // 1. Initialize Winsock
    printf("Initializing Winsock...\n");
    if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0) {
        printf("Failed. Error Code : %d\n", WSAGetLastError());
        return 1;
    }

    // 2. Create Socket
    if ((server_fd = socket(AF_INET, SOCK_STREAM, 0)) == INVALID_SOCKET) {
        printf("Could not create socket : %d\n", WSAGetLastError());
        WSACleanup();
        return 1;
    }

    // 3. Bind the socket
    address.sin_family = AF_INET;
    address.sin_addr.s_addr = INADDR_ANY;//0.0.0.0
    address.sin_port = htons(PORT);//8080

    if (bind(server_fd, (struct sockaddr *)&address, sizeof(address)) == SOCKET_ERROR) {
        printf("Bind failed with error code : %d\n", WSAGetLastError());
        closesocket(server_fd);
        WSACleanup();
        return 1;
    }

    // 4. Listen
    listen(server_fd, 3);
    printf("Server is running on http://localhost:%d\n", PORT);

    while(1) {
        printf("\nWaiting for incoming connections...\n");

        // 5. Accept Connection
        new_socket = accept(server_fd, (struct sockaddr *)&address, &addrlen);
        if (new_socket == INVALID_SOCKET) {
            printf("Accept failed with error code : %d\n", WSAGetLastError());
            continue;
        }

        // 6. Read Request
        int valread = recv(new_socket, buffer, BUFFER_SIZE, 0);
        if (valread > 0) {
            buffer[valread] = '\0'; 
            struct HTTP_Request req;
            parse_request(buffer, &req);
            print_request_details(&req); 
            if (req.path) {
                // Check if the path contains a file extension (a dot)
                int is_static_file = (strchr(req.path, '.') != NULL);
                char final_path[256];

                if (is_static_file) {
                    // This is a static file request (e.g., /image.png or /css/style.css)
                    printf(">> STATIC FILE request detected.\n");
                    get_final_path(req.path, final_path);
                    
                    if (strlen(final_path) > 0) {
                        send_file(new_socket, final_path);
                    } else {
                        send_404(new_socket);
                    }
                } else if (strcmp(req.path, "/") == 0) {
                    // Handle root path
                    strcpy(final_path, "index.html");
                    if (file_exists(final_path)) {
                        send_file(new_socket, final_path);
                    } else {
                        send_404(new_socket);
                    }
                }
                // --- MANIPULATION POINT: Dynamic Routing ---
                // else if (strcmp(req.path, "/api/data") == 0) {
                //     // Example API route handler (no file serving)
                //     char *json_response = 
                //         "HTTP/1.1 200 OK\r\n"
                //         "Content-Type: application/json\r\n"
                //         "Content-Length: 26\r\n\r\n"
                //         "{\"status\":\"API Online\"}";
                //     send(new_socket, json_response, strlen(json_response), 0);
                //     printf(">> API Route /api/data served.\n");
                // }
                // --- END Dynamic Routing ---
                else {
                    // No extension, no root, and no dynamic route matched. Attempt clean HTML file.
                    get_final_path(req.path, final_path);

                    if (strlen(final_path) > 0) {
                        // Successfully found file.html
                        send_file(new_socket, final_path);
                    } else {
                        // Nothing found
                        send_404(new_socket);
                    }
                }
            }
        }

        
        closesocket(new_socket); 
    }

    closesocket(server_fd);
    WSACleanup();

    return 0;
}


