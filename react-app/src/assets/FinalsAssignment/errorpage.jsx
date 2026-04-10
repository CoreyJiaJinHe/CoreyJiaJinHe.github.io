import { useEffect, useState } from 'react';
import './mycssv2.css';

function ErrorPage({ onNavigate, backendAvailable = false }) {


    return (
    <>

            <div class="content">
                <div style="margin:10px;background-color:lightblue;border:1px solid black;">
                    <h2 style="text-align:center">Page Not Found</h2>
                    <div style="margin-left:20px;text-align:center;height:600px;">
                        <p style="font-size:20px"> The page you requested does not exist.
                        </p>
                    </div>
                </div>
            </div>
            </>
            )

}

export default ErrorPage;