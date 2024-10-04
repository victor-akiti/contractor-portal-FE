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

export const getProtected = async (route) => {
    try {
        const request = await fetch(`http://localhost:8080/${route}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
        })

        const result = await request.json()

        return result
    } catch (error) {
        console.log({error});
    }
}