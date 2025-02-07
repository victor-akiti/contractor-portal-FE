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

export const deleteProtected = async (route, body, role) => {
    try {
        const request = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/${route}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "text/json"
            },
            credentials: "include",
            body: JSON.stringify(body)
        })

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