export const deletePlain = async (route, body) => {
    try {
        const request = await fetch(route, {
            method: "DELETE",
            headers: {
                "Content-Type": "text/json"
            },
            body: JSON.stringify(body)
        })
    } catch (error) {
        console.log({error});
    }
}

export const deleteProtected = async (route) => {
    try {
        const request = await fetch(route, {
            method: "DELETE",
            headers: {
                "Content-Type": "text/json"
            },
            body: JSON.stringify(body)
        })
    } catch (error) {
        console.log({error});
    }
}