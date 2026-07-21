# BIFL Frontend Application

This is the frontend user interface for the BIFL application, built with React. It provides the administrative dashboard for managing stores and flavours by interacting with the `bifl-backend` service.

This project was bootstrapped with Create React App.

## Technologies Used

*   **React**: A JavaScript library for building user interfaces.
*   **Create React App**: For bootstrapping the development environment.
*   **JavaScript (ES6+)**
*   **CSS**: For styling components.

## Prerequisites

Before you begin, ensure you have the following installed:
*   Node.js (LTS version recommended)
*   npm or yarn

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd bifl-ui
    ```

2.  **Install dependencies:**
    Using npm:
    ```bash
    npm install
    ```
    Or using yarn:
    ```bash
    yarn install
    ```

3.  **Configure Backend Proxy:**
    For the UI to communicate with the backend API during development, you need to add a proxy configuration to your `package.json` file. This avoids CORS issues.

    Add the following line to `bifl-ui/package.json`:
    ```json
    "proxy": "http://localhost:8080"
    ```
    This assumes your `bifl-backend` service is running on `http://localhost:8080`.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in development mode.<br />
Open http://localhost:3000 to view it in your browser. The page will reload when you make changes.

### `npm test`

Launches the test runner in interactive watch mode.

### `npm run build`

Builds the app for production to the `build` folder. It correctly bundles React in production mode and optimizes the build for the best performance.

