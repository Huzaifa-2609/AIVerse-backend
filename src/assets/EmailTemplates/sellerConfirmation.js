const sellerEmailTemplate = (verificationEmailUrl, user) => `<!DOCTYPE html>
<html>
  <head>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
        background-color: #f6f6f6;
      }
      .container {
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border: 1px solid #dddddd;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        overflow: hidden;
      }
      .header {
        /* background-color: #195d77; */
        color: #ffffff;
        padding: 24px;
        text-align: center;
      }
      .header h2 {
        margin: 0;
        font-size: 40px;
        color: rgb(34 126 161);
      }
      .content {
        padding: 20px;
      }
      .content h1 {
        color: #333333;
        font-size: 22px;
      }
      .content p {
        color: #666666;
        line-height: 1.6;
        font-size: 16px;
      }
      .button {
        display: inline-block;
        padding: 10px 20px;
        margin-top: 20px;
        font-size: 16px;
        color: #ffffff;
        background-color: #195d77;
        text-decoration: none;
        border-radius: 5px;
        text-align: center;
      }
      .button:hover {
        background-color: #163c50;
      }
      .footer {
        background-color: #f6f6f6;
        color: #999999;
        text-align: center;
        padding: 10px;
        font-size: 12px;
      }
      .img {
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 20px 0;
      }
      .img img {
        max-width: 100%;
        height: auto;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2>AIVerse</h2>
      </div>
      <div class="content">
        <h1>Confirm Your Seller Registration</h1>
        <p>Hello ${user},</p>
        <p>
          Thank you for registering as a seller with AIVerse! Please confirm your email address by clicking the button below:
        </p>
        <div class="img">
          <img
            height="300"
            src="https://res.cloudinary.com/dcwahx7wk/image/upload/v1720365001/lykfz3oo9o2ptaxemxzo.png"
            alt="Confirmation Image"
          />
        </div>
        <a href="${verificationEmailUrl}" class="button">Confirm Your Email</a>
        <p>If you did not register as a seller with AIVerse, please ignore this email.</p>
        <p>Best regards,<br />The AIVerse Team</p>
      </div>
      <div class="footer">
        <p>&copy; 2024 AIVerse. All rights reserved.</p>
      </div>
    </div>
  </body>
</html>`;
module.exports = { sellerEmailTemplate };
