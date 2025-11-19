#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <winsock2.h>
#include <ws2tcpip.h>


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
    char *version;
    struct HTTP_Header headers[MAX_HEADERS];
    int header_count;
    char *body;
};
// --- PARSING FUNCTION ---
// NOTE: This modifies the 'raw_buffer' in place for efficiency!
void parse_request(char *raw_buffer, struct HTTP_Request *req) {
    // Initialize struct
    memset(req, 0, sizeof(struct HTTP_Request));

    // 1. Separate the Body from the Headers
    // Look for the "Double Newline" (\r\n\r\n)
    char *body_start = strstr(raw_buffer, "\r\n\r\n");
    
    if (body_start) {
        req->body = body_start + 4; // Skip the 4 characters of \r\n\r\n
        *body_start = '\0';         // Cut the string here so headers stop reading
    } else {
        req->body = NULL; // No body found
    }

    // 2. Parse the Request Line (First Line)
    // Format: METHOD PATH VERSION
    char *line_ctx; // Context for strtok_r (safe tokenizing) or just use strtok
    
    // Get first line
    char *line = strtok(raw_buffer, "\r\n"); 
    if (line) {
        // We use sscanf to extract the 3 parts easily
        // We need temporary pointers because sscanf needs space to write, 
        // but here we just want to point into the existing string.
        // Actually, simple space splitting is safer here:
        
        req->method = strtok(line, " ");
        req->path = strtok(NULL, " ");
        req->version = strtok(NULL, " ");
    }

    // 3. Parse Headers
    // Keep getting lines until NULL
    while (line = strtok(NULL, "\r\n")) {
        if (req->header_count >= MAX_HEADERS) break;

        // Find the colon separator
        char *colon = strchr(line, ':');
        if (colon) {
            *colon = '\0'; // Split key and value
            
            req->headers[req->header_count].key = line;
            
            // The value starts after the colon. 
            // We typically want to skip the space after the colon (e.g. "Host: localhost")
            char *val = colon + 1;
            while (*val == ' ') val++; // Skip leading spaces
            
            req->headers[req->header_count].value = val;
            req->header_count++;
        }
    }
}

// --- HELPER TO PRINT REQUEST ---
void print_request_details(struct HTTP_Request *req) {
    printf("--- PARSED REQUEST ---\n");
    printf("Method:  %s\n", req->method ? req->method : "NULL");
    printf("Path:    %s\n", req->path ? req->path : "NULL");
    printf("Version: %s\n", req->version ? req->version : "NULL");
    
    printf("\n[Headers: %d]\n", req->header_count);
    for (int i = 0; i < req->header_count; i++) {
        printf("  %s = %s\n", req->headers[i].key, req->headers[i].value);
    }
    
    if (req->body) {
        printf("\n[Body]\n%s\n", req->body);
    }
    printf("----------------------\n");
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
            printf("Client requested: %s\n", req.path);
            print_request_details(&req);
        }

        // 7. Send Response
        const char *response_body = 
            "<!DOCTYPE html>"
            "<html>"
            "<head><title>Windows Server</title></head>"
            "<body>"
            "<h1>Hello from Windows!</h1>"
            "<p>This server is running purely on Winsock.</p>"
            "</body>"
            "</html>";

        char response_header[BUFFER_SIZE];
        snprintf(response_header, BUFFER_SIZE,
            "HTTP/1.1 200 OK\r\n"
            "Content-Type: text/html\r\n"
            "Content-Length: %llu\r\n"
            "\r\n", strlen(response_body));

        // Send headers
        send(new_socket, response_header, (int)strlen(response_header), 0);
        // Send body
        send(new_socket, response_body, (int)strlen(response_body), 0);

        printf("Response sent.\n");

        // 8. Close and Cleanup
        closesocket(new_socket); 
    }

    closesocket(server_fd);
    WSACleanup();

    return 0;
}


