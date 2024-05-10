import React, { useState } from 'react'
// import DetailedTable from './DetailedTable';
import Example from './DetailedTable';

const TableComponent = ({ combinations }) => {
    const [view, setView] = useState('detail');
    console.log(combinations)

    return (
        <>

            <div className="container mt-5 border">
                <div className="innercontainer container mt-4 mx-3 mb-5" style={{ width: '90%' }}>
                    <div className="tabs border-bottom d-flex">
                        <div className="detailmodel">
                            <button type="button" className={view === 'detail' ? 'btn btn-danger' : 'btn'} onClick={() => setView('detail')}>
                                Detail
                            </button>
                        </div>
                        <div className="summarymodel mx-1">
                            <button type="button" className={view === 'summary' ? 'btn btn-danger' : 'btn'} onClick={() => setView('summary')}>
                                Summary
                            </button>
                        </div>
                    </div>
                </div>
            <Example combinations={combinations} />
            </div>
        </>
    )
}

export default TableComponent