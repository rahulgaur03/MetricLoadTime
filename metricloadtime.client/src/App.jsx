import React, { useState } from 'react'
import './App.css';
import backgroundSVG from './assets/Background/Homepage.svg';
import InputComponent from './Components/InputComponent';
import TableComponent from './Components/TableComponent';

const App = () => {
  const [combinations, setCombinations] = useState({})
  localStorage.setItem('combinations', JSON.stringify(combinations))
  console.log(combinations)

  return (
    <>
      <nav className="navbar bg-body-tertiary">
        <div className="container-fluid mx-5">
          <a className="navbar-brand mx-5">Metric Load Time Tool</a>
        </div>
      </nav>

      {combinations.results ? (
        <TableComponent combinations={combinations} />
      ) : (
        <InputComponent setCombinations={setCombinations} />
      )}
      {/* <div style={{ backgroundImage: `url(${backgroundSVG})`, backgroundSize : 'content', height: '100vh'}}> */}
      {/* ASDF */}
      {/* </div> */}
    </>
  )
}

export default App
