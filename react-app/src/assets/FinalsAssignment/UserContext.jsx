import { createContext, useContext, useEffect, useMemo, useState } from "react";
export const UserContext = createContext();
const LEGACY_USER_STORAGE_KEY = "legacyUser";
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function isSessionExpired(user) {
    if (!user?.loggedInAt) {
        return true;
    }

    return Date.now() - user.loggedInAt > SESSION_MAX_AGE_MS;
}

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);

    const clearLegacyUser = () => {
        setUser(null);
    };

    const setLegacyUser = (nextUser) => {
        if (!nextUser) {
            setUser(null);
            return;
        }

        const normalizedUser = {
            ...nextUser,
            loggedInAt: nextUser.loggedInAt ?? Date.now(),
        };

        setUser(normalizedUser);
    };

    useEffect(() => {
        try {
            const storedUserRaw = localStorage.getItem(LEGACY_USER_STORAGE_KEY);
            if (storedUserRaw) {
                const storedUser = JSON.parse(storedUserRaw);
                if (storedUser?.username && !isSessionExpired(storedUser)) {
                    setUser(storedUser);
                } else {
                    localStorage.removeItem(LEGACY_USER_STORAGE_KEY);
                    setUser(null);
                }
            }
        }
        catch (error) {
            localStorage.removeItem(LEGACY_USER_STORAGE_KEY);
            setUser(null);
        }
    }, []);

    useEffect(() => {
        if (user) {
            localStorage.setItem(LEGACY_USER_STORAGE_KEY, JSON.stringify(user));
        } else {
            localStorage.removeItem(LEGACY_USER_STORAGE_KEY);
        }
    }, [user]);

    const isLoggedIn = Boolean(user);
    const value = useMemo(() => ({ user, setUser: setLegacyUser, setLegacyUser, clearLegacyUser, isLoggedIn }), [user, isLoggedIn]);


    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
}
export function useUser() {
    return useContext(UserContext);
}
