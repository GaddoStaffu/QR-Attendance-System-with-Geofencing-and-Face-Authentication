import React from "react";

const StudentSettings: React.FC = () => {
  return (
    <div>
      <h1>Student Settings</h1>
      <form>
        <div>
          <label htmlFor="name">Name:</label>
          <input type="text" id="name" name="name" />
        </div>
        <div>
          <label htmlFor="email">Email:</label>
          <input type="email" id="email" name="email" />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input type="password" id="password" name="password" />
        </div>
        <button type="submit">Save Settings</button>
      </form>
    </div>
  );
};

export default StudentSettings;
