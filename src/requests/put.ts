export const putPlain = async (route, body) => {
    try {
        const request = await fetch(`http://localhost:8080/${route}`, {
            method: "PUT",
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

export const putProtected = async (route, body) => {
    try {
        const request = await fetch(`http://localhost:8080/${route}`, {
            method: "PUT",
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