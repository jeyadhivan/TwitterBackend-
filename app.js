const express = require('express')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const path = require('path')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')

const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'twitterClone.db')

let db = null
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

//Register User API:1
app.post('/register/', async (request, response) => {
  let {username, name, password, gender} = request.body

  let hashedPassword = await bcrypt.hash(password, 10)

  let checkTheUsername = `
SELECT *
FROM user
WHERE username = '${username}';`
  let userData = await db.get(checkTheUsername)
  if (userData === undefined) {
    let postNewUserQuery = `
        INSERT INTO
        user (username,name,password,gender)
        VALUES (
            '${username}',
            '${name}',
            '${hashedPassword}',
            '${gender}'

        );`
    if (password.length < 6) {
      response.status(400)
      response.send('Password is too short')
    } else {
      let newUserDetails = await db.run(postNewUserQuery)
      response.status(200)
      response.send('User created successfully')
    }
  } else {
    response.status(400)
    response.send('User already exists')
  }
})

//Login API:2
app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `
    SELECT *
    FROM user
    WHERE
    username = '${username}'`
  const dbUser = await db.get(selectUserQuery)

  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      }
      console.log(payload) // Log the payload to verify it includes user_id
      const jwtToken = jwt.sign(payload, 'SECRET_TOKEN')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

//Authenticate Middleware API
const authenticateToken = (request, response, next) => {
  let jwtToken
  const authHeader = request.headers['authorization']

  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }

  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'SECRET_TOKEN', (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        console.log(payload) // Log the payload to verify it includes user_id
        request.user = payload // Attach the payload to the request object
        next()
      }
    })
  }
}

// Middleware to Get userId
const getUserId = async (request, response, next) => {
  const {username} = request.user // Access the username from the payload

  // Query to get the user_id based on the username
  const getUserIdQuery = `
    SELECT user_id
    FROM user
    WHERE username = ?;
    `

  try {
    const user = await db.get(getUserIdQuery, username)
    if (user) {
      request.user_id = user.user_id // Attach the user_id to the request object
      next()
    } else {
      response.status(404)
      response.send('User not found')
    }
  } catch (error) {
    console.log(`Error: ${error.message}`)
    response.status(500).send({error: error.message})
  }
}

//Get latest Tweets API:3
app.get('/user/tweets/feed/', authenticateToken, async (request, response) => {
  const {username} = request.user // Access the username from the payload

  // Query to get the user_id based on the username
  const getUserIdQuery = `
    SELECT user_id
    FROM user
    WHERE username = ?;
    `

  try {
    const user = await db.get(getUserIdQuery, username)
    const user_id = user.user_id

    // Query to get the latest tweets of the following users
    const getTweetsQuery = `
    SELECT
    user.username, tweet.tweet, tweet.date_time AS dateTime
    FROM
    follower
    INNER JOIN tweet ON follower.following_user_id = tweet.user_id
    INNER JOIN user ON tweet.user_id = user.user_id
    WHERE
    follower.follower_user_id = ?
    ORDER BY
    tweet.date_time DESC
    LIMIT 4;
    `

    const tweets = await db.all(getTweetsQuery, user_id) // Use user_id as a parameter
    response.send(tweets)
  } catch (error) {
    console.log(`Error: ${error.message}`)
    response.status(500).send({error: error.message})
  }
})

// API to get the list of people the user follows:4
app.get('/user/following/', authenticateToken, async (request, response) => {
  const {username} = request.user // Access the username from the payload

  // Query to get the user_id based on the username
  const getUserIdQuery = `
    SELECT user_id
    FROM user
    WHERE username = ?;
    `

  try {
    const user = await db.get(getUserIdQuery, username)
    const user_id = user.user_id
    // Query to get the names of the following users
    const getFollowingUsersQuery = `
    SELECT user.name
    FROM user
    INNER JOIN follower ON user.user_id = follower.following_user_id
    WHERE follower.follower_user_id = ?;
    `

    const followingUsers = await db.all(getFollowingUsersQuery, user_id) // Use user_id as a parameter
    response.send(followingUsers)
  } catch (error) {
    console.log(`Error: ${error.message}`)
    response.status(500).send({error: error.message})
  }
})

//Get the List of People Who Follow the User:5
app.get(
  '/user/followers/',
  authenticateToken,
  getUserId,
  async (request, response) => {
    const user_id = request.user_id // Access the user_id from the request object

    // Query to get the names of the followers
    const getFollowersQuery = `
    SELECT user.name
    FROM user
    INNER JOIN follower ON user.user_id = follower.follower_user_id
    WHERE follower.following_user_id = ?;
    `

    try {
      const followers = await db.all(getFollowersQuery, user_id) // Use user_id as a parameter
      response.send(followers)
    } catch (error) {
      console.log(`Error: ${error.message}`)
      response.status(500).send({error: error.message})
    }
  },
)

//API to get tweet details:6
app.get(
  '/tweets/:tweetId/',
  authenticateToken,
  getUserId,
  async (request, response) => {
    const {tweetId} = request.params
    const user_id = request.user_id // Access the user_id from the request object

    // Query to check if the tweet belongs to a followed user
    const checkTweetQuery = `
    SELECT tweet.tweet, tweet.date_time AS dateTime,
    (SELECT COUNT(*) FROM like WHERE like.tweet_id = tweet.tweet_id) AS likes,
    (SELECT COUNT(*) FROM reply WHERE reply.tweet_id = tweet.tweet_id) AS replies
    FROM tweet
    INNER JOIN follower ON tweet.user_id = follower.following_user_id
    WHERE tweet.tweet_id = ? AND follower.follower_user_id = ?;
    `

    try {
      const tweetDetails = await db.get(checkTweetQuery, [tweetId, user_id])
      if (tweetDetails) {
        response.send(tweetDetails)
      } else {
        response.status(401)
        response.send('Invalid Request')
      }
    } catch (error) {
      console.log(`Error: ${error.message}`)
      response.status(500).send({error: error.message})
    }
  },
)

//API to get list of usernames who liked a tweet:7
app.get(
  '/tweets/:tweetId/likes/',
  authenticateToken,
  async (request, response) => {
    const {tweetId} = request.params
    const {username} = request.user // Access the username from the payload

    // Query to get the user_id based on the username
    const getUserIdQuery = `
    SELECT user_id
    FROM user
    WHERE username = ?;
    `

    try {
      const user = await db.get(getUserIdQuery, username)
      const user_id = user.user_id

      // Query to check if the tweet belongs to a followed user
      const checkTweetQuery = `
    SELECT tweet.tweet_id
    FROM tweet
    INNER JOIN follower ON tweet.user_id = follower.following_user_id
    WHERE tweet.tweet_id = ? AND follower.follower_user_id = ?;
    `

      const tweet = await db.get(checkTweetQuery, [tweetId, user_id])
      if (tweet) {
        // Query to get the list of usernames who liked the tweet
        const getLikesQuery = `
    SELECT user.username
    FROM like
    INNER JOIN user ON like.user_id = user.user_id
    WHERE like.tweet_id = ?;
    `

        const likes = await db.all(getLikesQuery, tweetId)
        const usernames = likes.map(like => like.username)
        response.send({likes: usernames})
      } else {
        response.status(401)
        response.send('Invalid Request')
      }
    } catch (error) {
      console.log(`Error: ${error.message}`)
      response.status(500).send({error: error.message})
    }
  },
)

// API 8: Get replies for a tweet
app.get(
  '/tweets/:tweetId/replies/',
  authenticateToken,
  getUserId,
  async (request, response) => {
    const {tweetId} = request.params
    const {user_id} = request

    // Query to check if the user is following the tweet's author
    const checkFollowingQuery = `
    SELECT
    follower.following_user_id
    FROM
    follower
    INNER JOIN tweet ON tweet.user_id = follower.following_user_id
    WHERE
    follower.follower_user_id = ? AND tweet.tweet_id = ?;
    `

    try {
      const isFollowing = await db.get(checkFollowingQuery, [user_id, tweetId])

      if (isFollowing) {
        // Query to get the replies for the tweet
        const getRepliesQuery = `
    SELECT
    user.name,
    reply.reply
    FROM
    reply
    INNER JOIN user ON reply.user_id = user.user_id
    WHERE
    reply.tweet_id = ?;
    `

        const replies = await db.all(getRepliesQuery, [tweetId])
        response.send({replies})
      } else {
        response.status(401).send('Invalid Request')
      }
    } catch (error) {
      response.status(500).send({error: error.message})
    }
  },
)

// Get User Tweets API:9
app.get(
  '/user/tweets/',
  authenticateToken,
  getUserId,
  async (request, response) => {
    const {user_id} = request

    // Query to get the user's tweets along with likes and replies count
    const getUserTweetsQuery = `
    SELECT
    tweet.tweet,
    COUNT(DISTINCT like.like_id) AS likes,
    COUNT(DISTINCT reply.reply_id) AS replies,
    tweet.date_time AS dateTime
    FROM
    tweet
    LEFT JOIN like ON tweet.tweet_id = like.tweet_id
    LEFT JOIN reply ON tweet.tweet_id = reply.tweet_id
    WHERE
    tweet.user_id = ?
    GROUP BY
    tweet.tweet_id;
    `

    try {
      const userTweets = await db.all(getUserTweetsQuery, [user_id])
      response.send(userTweets)
    } catch (error) {
      response.status(500).send({error: error.message})
    }
  },
)

// Create Tweet API:10
app.post(
  '/user/tweets/',
  authenticateToken,
  getUserId,
  async (request, response) => {
    const {tweet} = request.body
    const {user_id} = request

    // Query to insert the tweet into the tweet table
    const createTweetQuery = `
    INSERT INTO tweet (tweet, user_id, date_time)
    VALUES (?, ?, ?);
    `

    try {
      const dateTime = new Date()
        .toISOString()
        .replace('T', ' ')
        .replace('Z', '')
      await db.run(createTweetQuery, [tweet, user_id, dateTime])
      response.status(200).send(`Created a Tweet`)
    } catch (error) {
      response.status(500).send({error: error.message})
    }
  },
)

// Delete Tweet API:11
app.delete(
  '/tweets/:tweetId/',
  authenticateToken,
  getUserId,
  async (request, response) => {
    const {tweetId} = request.params
    const {user_id} = request

    // Query to check if the tweet belongs to the authenticated user
    const checkTweetQuery = `
    SELECT * FROM tweet WHERE tweet_id = ? AND user_id = ?;
    `

    try {
      const tweet = await db.get(checkTweetQuery, [tweetId, user_id])

      if (tweet) {
        // Query to delete the tweet
        const deleteTweetQuery = `
    DELETE FROM tweet WHERE tweet_id = ?;
    `
        await db.run(deleteTweetQuery, [tweetId])
        response.send('Tweet Removed')
      } else {
        response.status(401).send('Invalid Request')
      }
    } catch (error) {
      response.status(500).send({error: error.message})
    }
  },
)

module.exports = app
