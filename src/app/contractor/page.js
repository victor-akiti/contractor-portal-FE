"use client"

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const Dashboard = () => {
    const router = useRouter();
    useEffect(()=> {
        router.push('/contractor/dashboard')
    }, [])

    return (
        <div>
            {/* <h1>Vendor dashboard</h1> */}
        </div>
    )
}

export default Dashboard