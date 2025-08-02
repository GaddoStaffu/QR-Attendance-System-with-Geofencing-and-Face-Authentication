# QR-Based-Attendance-System - FastAPI Backend - In Development

A QR Based Attendance System for USTP Alubijid with geofencing and face recognition technology for enhanced security and authentication.

## Front End

- **ReactJS**: A JavaScript library for building user interfaces. React allows you to create reusable components, making it easier to build and maintain large web applications.
- **ShadCN**: A set of design components built on top of Tailwind CSS. It provides pre-designed UI elements to speed up development and maintain consistent styling.
- **TypeScript**: A superset of JavaScript that adds static types, making your code easier to maintain and less error-prone.
- **CSS**: For custom styling and layout, we'll use regular CSS for global and component-specific styles.

## Back End

- **FastAPI**: A modern, fast (high-performance) web framework for building APIs with Python 3.7+ based on standard Python type hints.
- **MySQL**: We will use MySQL as the database management system for storing and querying our application data.

## Frameworks and Libraries

- **@zxing/browser**: This library is used for scanning QR codes directly from video streams using the browser. It supports multiple formats and provides an easy-to-use API to integrate barcode and QR code scanning functionality.
- **DeepFace**: DeepFace is a Python-based deep learning library used for facial recognition and emotion analysis. The library will be integrated on the backend via an API, enabling the system to process and analyze facial expressions and perform identity recognition.
- **face-api.js**: face-api.js is a JavaScript library that performs face detection and recognition directly within the browser. It provides a set of features to detect and recognize faces from images and video streams, which can be used for the frontend portion of the application.
- **Geolocation API**: The Geolocation API is used for obtaining the geographical location of the user through their device. This functionality will be important for tracking location data and implementing features like geofencing, which will be incorporated into the system for enhanced security and attendance tracking.
- **Qrcode**: The Qrcode library will be used for generating QR codes. It will be integrated into the frontend to enable users to generate their own QR codes for attendance tracking or other purposes within the system.

## System Requirements

To successfully run and develop this project, your system should meet the following requirements:

**General:**

- **Operating System:** Windows 10/11, macOS, or a modern Linux distribution.
- **Web Browser:** A modern web browser such as Chrome, Firefox, Safari, or Edge for accessing the frontend.
- **Webcam:** Required for face recognition and QR code scanning features.

**For Frontend Development:**

- **Node.js:** Version 18.x (LTS) or higher is recommended.
- **npm:** Version 8.x or higher (usually comes with Node.js).

**For Backend Development (Python & FastAPI):**

- **Python:** Version 3.10 is required for insightface.
- **MySQL Server:** A running instance of MySQL (e.g., version 5.7 or 8.0).

**Specific for Face Recognition (DeepFace/insightface on Windows):**

- **Microsoft C++ Build Tools:** If you are on Windows and installing libraries like `dlib` (a common dependency for face recognition packages) or certain components of `insightface` (which `DeepFace` can use as a backend), you will likely need the Microsoft C++ Build Tools.
  - You can get these by installing "Build Tools for Visual Studio 2022" (or 2019). Ensure the "C++ build tools" workload is selected during installation. This includes the "MSVC v142 - VS 2019 C++ x64/x86 build tools" (or newer for VS 2022) and the "Windows 10/11 SDK".
  - Alternatively, installing the full Visual Studio IDE (Community edition is free) with the "Desktop development with C++" workload will also provide these tools.

**Note on DeepFace/insightface:**

- `DeepFace` itself might pull `insightface` or other heavy computer vision libraries as dependencies. These libraries can have their own specific system requirements or compilation needs, especially on Windows. Always check the official documentation of `DeepFace` and its underlying models/backends for the most up-to-date and detailed requirements.
- Sufficient RAM (e.g., 8GB+, 16GB recommended) and a decent CPU are beneficial for running face recognition models. A GPU can significantly speed up processing if supported by the chosen DeepFace backend and configured correctly.

## Development

### Steps to start FastAPI

1. **Navigate to the project root directory:**
   Open your terminal or command prompt and change to the `QR-Based-Attendance-System` directory (this is the folder that contains the `backend` sub-directory and your `requirements.txt` file).

   ```bash
   cd QR-Based-Attendance-System
   ```

2. **Create a Python virtual environment:**
   If you haven't already, create a virtual environment.

   ```bash
   python -m venv .venv
   ```

3. **Activate the virtual environment:**

   - On Windows:
     ```cmd
     .venv\Scripts\activate
     ```
   - On macOS/Linux:
     ```bash
     source .venv/bin/activate
     ```

4. **Install the required Python packages:**
   Ensure your `requirements.txt` file is up-to-date in the project root. Then run:

   ```bash
   pip install -r requirements.txt
   ```

5. **Create a Secret Key:**
   IMPORTANT! Create a secret key in `backend/` by creating a `.env` file with a `SECRET_KEY=your_super_secret_key_here` variable.

6. **Run the FastAPI backend server:**
   This command assumes your main FastAPI application instance is located in `backend/main.py` and is configured to run when the module is executed.

   ```bash
   python -m backend.main
   ```

### Steps to start Frontend server

1. **Navigate to the frontend directory:**
   Open your terminal or command prompt and change to the `qr-based-attendance-system` directory.

   ```bash
   cd qr-based-attendance-system
   ```

2. **Install the required dependencies:**
   Run the following command to install all necessary packages.

   ```bash
   npm install
   ```

3. **Set up SSL certificates:**
   Install the `mkcert` package globally if not already installed.

   ```bash
   npm install -g mkcert
   ```

   Create a folder named `certs` to store the certificates.

   ```bash
   mkdir certs
   cd certs
   ```

   Generate the CA and certificate files.

   ```bash
   mkcert create-ca
   mkcert create-cert
   ```

   Move the `certs` folder outside the `qr-based-attendance-system` folder.

   ```bash
   mv certs ../
   ```

4. **Verify certificate configuration:**
   Check the `vite.config.ts` file to ensure the key and certificates are properly referenced (e.g., `fs.readFileSync(path.resolve(__dirname, '../certs', 'cert.key'))`).

5. **Create a global variable:**
   go to `qr-based-attendance-system\` and create a file called `.env` with a variable `VITE_API_URL=YOUR API HERE`

6. **Start the frontend development server:**
   Run the following command to start the local server.

   ```bash
   npm run dev
   ```

### Future Development

**Enhance Project Documentation:** Expand and organize the documentation to include clear setup instructions, API references, component usage examples, and contribution guidelines to make the project easier to understand and contribute to.
**Improve Responsiveness of React Components:** Refactor UI components to ensure consistent behavior and appearance across various screen sizes and devices.  
**Refactor and Standardize Codebase:** Improve code readability by enforcing consistent formatting, removing unused code, and applying best practices.
