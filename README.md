# 🐦 Twitter Clone API

This is a **Node.js + Express** based RESTful API that simulates core functionalities of Twitter including user registration, login, following users, posting tweets, and interacting with tweets through likes and replies.

## 📁 Project Structure

- **Backend**: Express.js
- **Database**: SQLite
- **Authentication**: JWT
- **Password Security**: Bcrypt

---

## 🚀 Features

- User Registration & Login with JWT Auth
- Passwords securely hashed with Bcrypt
- Follow/Unfollow user logic
- Post, view, like, and reply to tweets
- Retrieve feeds, followers, and following info
- Secure access with middleware authentication

---

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/twitter-clone-api.git
   cd twitter-clone-api
2. **Install Dependencies**  
    ```bash
    npm install
  
3. **Create the SQLite database**

    Make sure you have a file called twitterClone.db in the root. It should include tables:
    
    user
    
    follower
    
    tweet
    
    like
    
    reply

4. Start the server
    ```bash
    node index.js
    
  Server will run on: http://localhost:3000

🔐 **Authentication**  
   All protected routes require a **JWT token** in the Authorization header:
    
    Authorization: Bearer <jwt_token>
    
##🧪API Endpoints
### ✅ Register User

  **POST** `/register/`
  
  Request Body:
  ```bash
  {
  "username": "john_doe",
  "name": "John Doe",
  "password": "password123",
  "gender": "male"
  }
  ```

🔐 Login
   
   **POST**  `/login/`
    
   Request Body:
  ```
  {
    "username": "john_doe",
    "password": "password123"
  }
  ```
  Response:
  ```
  {
    "jwtToken": "<your_token>"
  }
  ```

📰 Get Feed
  
  GET  `/user/tweets/feed/`
  
  Headers: `{ Authorization: Bearer <token> }`
  

👥 Get Following

  GET  `/user/following/`
 
  Headers: `{ Authorization: Bearer <token> }`


👣 Get Followers

  GET  `/user/followers/`
  
  Headers: `{ Authorization: Bearer <token> }`


🧵 Tweet Details
 
  GET  `/tweets/:tweetId/`
  
  Headers: `{ Authorization: Bearer <token> }`


###❤️ Who Liked a Tweet
 
  GET  `/tweets/:tweetId/likes/`
  
  Headers: `{ Authorization: Bearer <token> }`
  

💬 Get Replies

  GET  `/tweets/:tweetId/replies/`

  Headers: `{ Authorization: Bearer <token> }`


🧍 User’s Tweets

  GET  `/user/tweets/`

  Headers: `{ Authorization: Bearer <token> }`


✏️ Create a Tweet
  
  POST  `/user/tweets/`

  Headers: `{ Authorization: Bearer <token> }`
  
  Body:
  ```
  {
    "tweet": "Hello Twitter!"
  }
  ```

❌ Delete a Tweet

  DELETE  `/tweets/:tweetId/`
  
  Headers: `{ Authorization: Bearer <token> }`


🧰 Tech Stack
  Node.js
    
  Express.js
    
  SQLite
    
  bcrypt
    
  JWT

👩‍💻 Author

Jeyalakshmi

Feel free to contribute or raise issues to improve this project!

