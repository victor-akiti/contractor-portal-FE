export const putPlain = async (route, body) => {
    try {
        const request = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/${route}`, {
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

export const putProtected = async (route, body, role) => {
    try {
        const request = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/${route}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
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