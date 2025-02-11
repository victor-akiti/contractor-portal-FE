export const deletePlain = async (route, body) => {
    try {
        const request = await fetch(route, {
            method: "DELETE",
            headers: {
                "Content-Type": "text/json"
            },
            body: JSON.stringify(body)
        })

        const result = await request.json()

        return result
    } catch (error) {
        console.log({error});
    }
}

export const deleteProtected = async (route, body) => {
    try {
        const request = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/${route}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "text/json"
            },
            credentials: "include",
            body: JSON.stringify(body)
        })

        const result = await request.json()

        return result
    } catch (error) {
        console.log({error});
    }
}