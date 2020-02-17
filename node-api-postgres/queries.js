const Pool = require('pg').Pool
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'smartmeeting',
  password: 'vajus',
  port: 5432,
})

//GET all users
const getUsers = (request, response) => {
    pool.query('SELECT * FROM public."Project" ORDER BY pro_id ASC', (error, results) => {
      if (error) {
        throw error
      }
      response.status(200).json(results.rows)
    })
}

//GET a single user by id
const getUserById = (request, response) => {
    const id = parseInt(request.params.id)

    pool.query('SELECT * FROM public."Project" WHERE pro_id = $1', [id], (error, results) => {
      if (error) {
      throw error
      }
      response.status(200).json(results.rows)
    })
}

//POST a new user
const createUser = (request, response) => {
    const { name, pw } = request.body
  
    pool.query('INSERT INTO Project (pro_name, pro_pw) VALUES ($1, $2)', [name, pw], (error, results) => {
      if (error) {
        throw error
      }
      response.status(201).send(`User added with ID: ${result.insertId}`)
    })
}

//PUT updated data in an existing user
const updateUser = (request, response) => {
    const id = parseInt(request.params.id)
    const { name, pw } = request.body
  
    pool.query('UPDATE Project SET pro_name = $1, pro_pw = $2 WHERE pro_id = $3',[name, pw, id],(error, results) => {
        if (error) {
          throw error
        }
        response.status(200).send(`User modified with ID: ${id}`)
      }
    )
}

//DELETE a user
const deleteUser = (request, response) => {
    const id = parseInt(request.params.id)
  
    pool.query('DELETE FROM Project WHERE pro_id = $1', [id], (error, results) => {
      if (error) {
        throw error
      }
      response.status(200).send(`User deleted with ID: ${id}`)
    })
}

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
}