import React, { useState, useEffect } from 'react'
import './App.css'
import {Button, Container} from 'react-bootstrap';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link,
  Redirect
} from "react-router-dom";
import Auth from './Auth'
import Journal from './Journal'
import Family from './Family'

function App() {
  const [jwt, setJwt] = useState()

  const onAuth = jwt => setJwt(jwt)

  const logout = () => {
    localStorage.removeItem('jwt')
    window.location.href = "/"
  }

  const renderLogout = () => (
    <Button
      variant='danger'
      size='sm'
      className='logout-button'
      onClick={logout}
    >
      Logout
    </Button>
  )

  const renderApp = () => {
    if (!jwt) {return <Auth onAuth={onAuth} />}
    return (
      <div>
        {renderLogout()}
        <Switch>
          <Route path="/j">
            <Journal jwt={jwt} />
          </Route>
          <Route path="/family">
            <Family jwt={jwt} />
          </Route>
          <Redirect from="/" to="/j" />
        </Switch>
      </div>
    )
  }

  return (
    <Router>
      <Container fluid>
        <Link to="/"><h1>Gnothi</h1></Link>
        {renderApp()}
      </Container>
    </Router>
  )
}

export default App;
