
async function sendAuthRequest(url, data) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Something went wrong.");
  }

  return result;
}

const signinForm = document.getElementById("signin-form");
const signupForm = document.getElementById("signup-form");
const message = document.getElementById("auth-message");

if (signinForm) {
  signinForm.addEventListener("submit", async event => {
    event.preventDefault();
    message.textContent = "Signing in...";

    const email = document.getElementById("signin-email").value;
    const password = document.getElementById("signin-password").value;

    try {
      await sendAuthRequest("/api/signin", { email, password });
      window.location.href = "/index.html";
    } catch (error) {
      message.textContent = error.message;
    }
  });
}

if (signupForm) {
  signupForm.addEventListener("submit", async event => {
    event.preventDefault();
    message.textContent = "Creating account...";

    const name = document.getElementById("signup-name").value;
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;

    try {
      await sendAuthRequest("/api/signup", { name, email, password });
      window.location.href = "/index.html";
    } catch (error) {
      message.textContent = error.message;
    }
  });
}

// Sign-out support on the games page.
const signoutButton = document.getElementById("signout-btn");

if (signoutButton) {
  signoutButton.addEventListener("click", async () => {
    try {
      await sendAuthRequest("/api/signout", {});
      window.location.href = "/signin.html";
    } catch (error) {
      alert(error.message);
    }
  });
}
