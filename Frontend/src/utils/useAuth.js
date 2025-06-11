import { jwtDecode } from "jwt-decode";


export const getCurrentUser = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const user = jwtDecode(token);
    return user;
  } catch (err) {
    return null;
  }
};
