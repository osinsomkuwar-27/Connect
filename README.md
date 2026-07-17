# Connect

Technologies Used:
Database: MongoDB
Backend: Bcrypt, Crypto, Socket, Express.js
Frontend: React, MaterialUI, WebRTC, AXIOS, CSS

What is CORS?
CORS (Cross-Origin Resource Sharing) is a security feature implemented by web browsers to control how web applications can request resources from different origins (domains).

The primary purpose of CORS is to prevent malicious websites from making unauthorized requests to another site on behalf of a user.

How Does It Work?
When a web application makes a request to a resource on a different origin (domain, protocol, or port), the browser checks whether the target server allows the request.

This is done by the server sending specific HTTP headers in its response. These headers define what types of requests are permitted from different origins.

Example

Imagine you have a web application hosted on delta.com, and it needs to make a request to an API hosted on zoom.delta.com.

By default, the browser blocks this request due to the Same-Origin Policy.

However, if the API server includes the appropriate CORS header in its response, such as:

Access-Control-Allow-Origin: delta.com

then the browser will allow the request to proceed.

Important CORS Headers
1. Access-Control-Allow-Origin

Specifies which origins are allowed to access the resource.
It can be a specific origin or a wildcard (*), which allows any origin.

2. Access-Control-Allow-Methods

Lists the HTTP methods that are permitted for cross-origin requests.
Examples: GET, POST, PUT, DELETE

3. Access-Control-Allow-Headers

Specifies which HTTP headers can be used in the actual request.

4. Access-Control-Allow-Credentials

Indicates whether the request can include user credentials such as cookies or HTTP authentication.

5. Access-Control-Expose-Headers

Specifies which response headers can be exposed to the browser.

Token in Authentication

In authentication systems, a token is a piece of data that represents a user's credentials. It is used to verify the identity of a user or device trying to access a resource.

Tokens are commonly used in stateless authentication systems, where the server does not maintain session information about the user between requests.

There are multiple types of tokens, such as:

Access Tokens
Refresh Tokens
ID Tokens
How Are Tokens Used in the Authentication Flow?
Step 1: User Login

The user provides their credentials (e.g., username and password) to authenticate with the server.

Step 2: Token Generation

Upon successful authentication, the server generates a token and sends it back to the client.

Step 3: Token Storage

The client stores the token, typically in local storage or a cookie.

Step 4: Authenticated Requests

For subsequent requests, the client includes the token in the HTTP headers (usually in the Authorization header) to access protected resources.

Authorization: Bearer <token>
Step 5: Token Verification

The server verifies the token to ensure that the request is authenticated and authorized.

JSON Web Token (JWT)

A well-known example of token-based authentication is JWT (JSON Web Token).

JWTs are:

Compact
URL-safe
Easy to parse and validate

A JWT consists of three parts:

Header – Contains metadata about the token (e.g., signing algorithm)
Payload – Contains the actual data (e.g., user information)
Signature – Used to verify the authenticity of the token

STUN servers are lightweight servers running on the public internet which return the IP adress of the requester's device.

The Navigator interface represents the state and the identity of the user agent. It allows scripts to query it and to register themselves to carry on some activities.
A Navigator object can be retrieved using the read-only window.navigator property.

The mediaDevices read-only property of the Navigator interface returns a MediaDevices object, which provides access to connected media input devices like cameras and microphones, as well as screen sharing.