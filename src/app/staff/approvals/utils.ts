export const userCanTogglePriority = (user) => {
    if (!user) return false;
    const allowedRoles = ["Admin", "HOD", "Supervisor", "C and P Supervisor", "C and P Staff"].map(x => x.toLowerCase());
    return allowedRoles?.includes(user?.role?.toLowerCase());
};