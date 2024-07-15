const express = require('express')
const app = express()
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const dbPath = path.join(__dirname, 'userData.db')
const bcrypt = require('bcrypt') //(Here bcrypt package used because storing a plain password is not a good idea since they can be miss used because of this we used bcrypt package to make password unpredictable)
app.use(express.json())
const jwt = require('jsonwebtoken')

let db = null
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('server running successfully')
    })
  } catch (e) {
    console.log(`DB Error:${e.message}`)
    process.exit(1)
  }
}
initializeDBAndServer()

//User Registration

app.post('/register', async (request, response) => {
  const {username, password, email, role} = request.body
  const hashedPassword = await bcrypt.hash(password, 10)
  const selectUserQuery = `select * from user where username="${username}"`
  const dbuser = await db.get(selectUserQuery)

  if (dbuser === undefined) {
    const createUserQuery = `INSERT INTO user (username,password,email,role)
    VALUES
    ("${username}","${hashedPassword}","${email}","${role}");
    `

    await db.run(createUserQuery)
    response.status(201)
    response.send('User Registered SuccessFully')
  } else {
    response.status(400)
    response.send('User Already Exists!!')
  }
})

//Login
app.post('/login', async (request, response) => {
  const {email, password} = request.body
  const selectUserQuery = `select * from user where email="${email}"`
  const dbuser = await db.get(selectUserQuery)
  if (dbuser === undefined) {
    response.status(400)
    response.send('Invalid User')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbuser.password)
    //console.log(isPasswordMatched)
    if (isPasswordMatched === true) {
      response.status(200)
      const payload = {email}
      const jwtToken = jwt.sign(payload, 'TOKEN')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid Password')
    }
  }
})

//MIDDLEWARE FUNCTION
const authentication = (request, response, next) => {
  const authHeader = request.headers['authorization']
  let jwtToken
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(400)
    response.send('Token not Provided')
  } else {
    jwt.verify(jwtToken, 'TOKEN', async (error, payload) => {
      if (error) {
        response.status(400)
        response.send('Token not provided')
      } else {
        next()
      }
    })
  }
}

//GET
app.get('/product', authentication, async (request, response) => {
  const getProductQuery = `select * from product;`
  const productsArray = await db.all(getProductQuery)
  response.send(productsArray)
})

//POST

app.post('/products', authentication, async (request, response) => {
  const {title, description, count} = request.body
  const createProduct = `INSERT INTO product (title,description,count)
  VALUES
  ("${title}","${description}",${count});`
  await db.run(createProduct)
  response.send('Product Added Successfully')
})

//PUT
app.put('/product/:countId', authentication, async (request, response) => {
  const {countId} = request.params
  const {title, description, count} = request.body
  const updateProductQuery = `UPDATE product
  SET
  title="${title}",
  description="${description}",
  count=${count}
  where
  count=${countId}
  ;`

  await db.run(updateProductQuery)
  response.send('Product Updated SuccessFully')
})

//DELETE

app.delete('/product/:countId', authentication, async (request, response) => {
  const {countId} = request.params
  const deleteQuery = `DELETE FROM product where count=${countId}`
  await db.run(deleteQuery)
  response.send('Product Deleted Successfully')
})
