SwearJar
========

SwearJar is a NodeJS app that tracks the use of "forbidden" words and the associated costs for each user.

**Install instructions**
<br/>*Local* (assuming you have Node and MongoDB installed)<br/>
1. Clone repo `git clone https://github.com/john-brock/SwearJar.git`<br/>
2. Navigate to SwearJar directory `cd SwearJar`<br/>
3. Install dependencies `npm install`<br/>
3. Start MongoDB `mongod`<br/>
4. Start SwearJar `foreman start` or `node app.js`<br/>

<br/>*Heroku* (assuming you have Heroku CLI)<br/>
1. Create new Heroku app from SwearJar directory `heroku create`<br/>
2. Add a MongoDB add-on `heroku addons:create mongolab:sandbox`<br/>
3. Deploy to Heroku `git push heroku master`<br/>
<br/>More info: https://devcenter.heroku.com/articles/getting-started-with-nodejs

**API**
<br/>*Users*
- List users
  <br/>`GET /users`
- Add new user
  <br/>`POST /users` with data `{ id: userId, name: userName, wordCost: cost (optional) }`
- Update user information
  <br/>`POST /users` with data `{ id: userId, name: userName (optional), wordCost: cost (optional) }`
- Get summary overview of all user data
  <br/>`GET /users/summary`
- Retrive specific user
  <br/>`GET /users/:userId`
- Retrieve the amount a specific user owes
  <br/>`GET /users/:userId/owes`
- Retrieve the amount a specific user has paid
  <br/>`GET /users/:userId/paid`
- Update the amount a specific user has paid
  <br/>`POST /users/:userId/paid` with data `{ amount: amountPaid }`
- Retireve the word infractions for a specific user
  <br/>`GET /users/:userId/words`
- Retrieve the number of infractions for a specific user
  <br/>`GET /users/:userId/words/count`

*Forbidden Words*
- List words
  <br/>`GET /words`
- Add new or update forbidden word
  <br/>`POST /words` with data `{ word: word, category: category (optional), active: active (optional) }`
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
