SwearJar
========

Swear Jar app to track use of "forbidden" words

**API**
<br/>*Users*
- List users
  <br/>`GET /users`
- Add new user
  <br/>`POST /users` with data `{id: userId, name: userName, wordCost: cost (optional) }`
- Update user information
  <br/>`POST /users` with data `{id: userId, name: userName (optional), wordCost: cost (optional) }`
- Get summary overview of all user data
  <br/>`GET /users/summary`
- Retrive specific user
  <br/>`GET /users/:userId`
- Retrieve the amount a specific user owes
  <br/>`GET /users/:userId/owes`
- Retrieve the amount a specific user has paid
  <br/>`GET /users/:userId/paid`
- Retireve the word infractions for a specific user
  <br/>`GET /users/:userId/words`
- Retrieve the number of infractions for a specific user
  <br/>`GET /users/:userId/words/count`

*Forbidden Words*
- List words
  <br/>`GET /words`
- Add new forbidden word
  <br/>`POST /words` with data `{word: word, category: category (optional) }`
- Get summary of word infraction counts
  <br/>`GET /words/count`
- Get information for specific word
  <br/>`GET /words/:word`
- Get infraction count for specific word
  <br/>`GET /words/:word/count`

**UI**
- Report new infraction (word usage)
  `/`
- View analytics for infractions
  `/charts`
