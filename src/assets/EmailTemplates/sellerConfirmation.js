const sellerEmailTemplate = (verificationEmailUrl, user) => `<!DOCTYPE html>
<html>
  <head>
    <title>AIVerse Email Template</title>
  </head>
  <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f6f6f6">
    <table
      align="center"
      border="0"
      cellpadding="0"
      cellspacing="0"
      style="
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border: 1px solid #dddddd;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        overflow: hidden;
      "
    >
      <tr>
        <td align="center" style="padding: 24px">
          <h2 style="margin: 0; font-size: 40px; color: rgb(34 126 161)">AIVerse</h2>
        </td>
      </tr>
      <tr>
        <td style="padding: 20px">
          <h1 style="color: #333333; font-size: 22px">Confirm Your Seller Registration</h1>
          <p>Hello ${user},</p>
          <p>
            Thank you for registering as a seller with AIVerse! Please confirm your email address by clicking the button
            below:
          </p>
          <div style="display: flex; align-items: center; justify-content: center; margin: 20px 0">
            <img
              src="https://res.cloudinary.com/dcwahx7wk/image/upload/v1720365001/lykfz3oo9o2ptaxemxzo.png"
              alt="Confirmation Image"
              style="max-width: 100%; height: auto"
            />
          </div>
          <a
            href="${verificationEmailUrl}"
            style="
              display: inline-block;
              padding: 10px 20px;
              margin-top: 20px;
              font-size: 16px;
              color: #ffffff;
              background-color: #195d77;
              text-decoration: none;
              border-radius: 5px;
              text-align: center;
            "
            target="_blank"
            >Confirm Your Email</a
          >
          <p>If you did not register as a seller with AIVerse, please ignore this email.</p>
          <p>Best regards,<br />The AIVerse Team</p>
        </td>
      </tr>
      <tr>
        <td bgcolor="#f6f6f6" style="text-align: center; padding: 10px; color: #999999; font-size: 12px">
          <p>&copy; 2024 AIVerse. All rights reserved.</p>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
module.exports = { sellerEmailTemplate };
