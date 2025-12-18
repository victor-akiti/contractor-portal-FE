export const userCanTogglePriority = (user) => {
    if (!user) return false;
    const allowedRoles = ["Admin", "HOD", "Supervisor", "C and P Supervisor"];
    return allowedRoles.includes(user?.role);
};