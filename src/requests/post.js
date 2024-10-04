export const postPlain = async (route, body) => {
    try {
        const request = await fetch(`http://localhost:8080/${route}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify(body)
        })
    } catch (error) {
        console.log({error});
    }
}

export const postProtected = async (route, body) => {
    try {
        const request = await fetch(`http://localhost:8080/${route}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify(body)
        })

        const response = await request.json()
        return response
    } catch (error) {
        console.log({error});
    }
}

export const postProtectedMultipart = async (route, body) => {
    try {
        const request = await fetch(`http://localhost:8080/${route}`, {
            method: "POST",
            headers: {
                // "Content-Type": "application/json"
            },
            credentials: "include",
            body
        })

        const response = await request.json()
        return response
    } catch (error) {
        console.log({error});
    }
}