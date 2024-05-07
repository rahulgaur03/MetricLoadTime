import { useEffect, useState } from 'react';
import './App.css';

function App() {
    const [result, setResult] = useState();
    const [number1, setNumber1] = useState(0);
    const [number2, setNumber2] = useState(0);

    useEffect(() => {
        Sub();
    }, [number1, number2]);

    async function Add() {
        // Make a GET request to your calculator API
        const response = await fetch(`api/calculator/add?number1=${number1}&number2=${number2}`);
        console.log(response);
        // Handle response
        if (response.ok) {
            const result = await response.json();
            setResult(result);
        } else {
            setResult('Error occurred');
        }
    }

    async function Sub() {
        // Make a GET request to your calculator API
        const response = await fetch(`query/adomd/sub?number1=${number1}&number2=${number2}`);
        console.log(response);
        // Handle response
        if (response.ok) {
            const result = await response.json();
            setResult(result);
        } else {
            setResult('Error occurred');
        }
    }

    return (
        <div>
            <h1>Calculator</h1>
            <div>
                <label>Number 1:</label>
                <input type="number" value={number1} onChange={e => setNumber1(parseInt(e.target.value))} />
            </div>
            <div>
                <label>Number 2:</label>
                <input type="number" value={number2} onChange={e => setNumber2(parseInt(e.target.value))} />
            </div>
            <div>
                <button onClick={Add}>Add</button>
            </div>
            <div>
                <button onClick={Sub}>Sub</button>
            </div>
            <div>
                <h2>Result: {result}</h2>
            </div>
        </div>
    );
}

export default App;
