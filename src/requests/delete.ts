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

export const deleteProtected = async (route, body) => {
    try {
        const request = await fetch(`https://ultimate-arleen-amni-5494bb5f.koyeb.app/${route}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "text/json"
            },
            credentials: "include",
            body: JSON.stringify(body)
        })
    } catch (error) {
        console.log({error});
    }
}