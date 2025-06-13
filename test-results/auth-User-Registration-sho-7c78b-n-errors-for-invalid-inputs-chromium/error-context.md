# Page snapshot

```yaml
- heading "Create your account" [level=2]
- paragraph:
  - text: Or
  - link "sign in to your existing account":
    - /url: /auth/signin
- text: Name (optional)
- textbox "Name (optional)"
- text: Email address
- textbox "Email address"
- text: Password
- textbox "Password"
- text: Confirm Password
- textbox "Confirm Password"
- button "Create account"
- text: Or continue with
- link "Sign up with Google Google":
  - /url: /auth/signin
  - text: Sign up with Google
  - img
  - text: Google
- link "Sign up with Spotify Spotify":
  - /url: /auth/signin
  - text: Sign up with Spotify
  - img
  - text: Spotify
- button "Open Tanstack query devtools":
  - img
- button "Open Tanstack query devtools":
  - img
- status:
  - img
  - text: Static route
  - button "Hide static indicator":
    - img
- alert
```