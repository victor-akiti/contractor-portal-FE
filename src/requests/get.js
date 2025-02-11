export const getPlain = async (route) => {
    try {
        const request = await fetch(route, {
            method: "GET",
            headers: {
                "Content-Type": "text/json"
            }
        })
    } catch (error) {
        console.log({error});
    }
}

export const getProtected = async (route, role) => {
    console.log({route, role});
    
    try {
        const request = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/${route}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
        })

        console.log({request: request.status});

        if (request.status === 401) {
            if (!role || role === "Vendor" || role === "User") {
                window.location.href = "/login"
            } else {
                window.location.href = "/login/staff"
            }
        } else {
            const result = await request.json()

            return result
        }
        

        
    } catch (error) {
        console.log({error});
    }
}