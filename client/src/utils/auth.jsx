import api from "../services/api";

export const registerUser = (data) => {
  return api.post("/accounts/register/", { role: "traveler", ...data });
};

export const loginUser = async (data) => {
  const res = await api.post("/accounts/login/", data);
  localStorage.setItem("token", res.data.access);
  return res;
};

export const isAuthenticated = () => {
  return !!localStorage.getItem("token");
};

export const logoutUser = () => {
  localStorage.removeItem("token");
};
