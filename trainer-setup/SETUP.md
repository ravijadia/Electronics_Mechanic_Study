# Trainer setup: receive practical records on a dashboard

Trainees press **Send to trainer** on a practical. The record is saved as a PDF in **your** Google Drive and added to a Google Sheet. You see it all on the site at `/trainer`. About 15 minutes, once.

## 1. Make the Sheet and paste the script

1. In your Google account, create a new Google Sheet. Name it "EMT practicals".
2. Menu **Extensions > Apps Script**. Delete the sample code, paste in all of `Code.gs` from this folder, click **Save**.
3. Go back to the Sheet and reload the page. A new menu **Trainer tools** appears.
4. **Trainer tools > Set up sheets**. Google asks you to allow access (Sheets and Drive). Choose your account, **Advanced > Go to project**, **Allow**. Run it again if it only asked for permission.
5. Open the **Batches** tab. Each row is one batch: its name and the code you give those trainees. Change the sample row and add more.
6. Optional: fill the **Roster** tab (Batch, Roll, Name) so the dashboard also shows trainees who have sent nothing.
7. **Trainer tools > Show trainer key**. Write it down. It is the password for the dashboard.

## 2. Publish the script

1. In Apps Script, **Deploy > New deployment**, type **Web app**.
2. *Execute as*: **Me**. *Who has access*: **Anyone**. Click **Deploy** and allow access.
3. Copy the **Web app URL** (it starts with `https://script.google.com/macros/s/`).

## 3. Switch it on in the site

1. Open `site/src/submit/config.ts` and paste the URL between the quotes.
2. Build and publish the site as usual.
3. Give each batch its **batch code** (from the Batches tab).

## Using it

- **Trainees:** on a practical, fill in name, roll no., batch, date and batch code, then press **Send to trainer**. They can send again after changing their work; the new record replaces the old one.
- **You:** open `https://ravijadia.github.io/Electronics_Mechanic_Study/trainer`, type the trainer key, choose the batch. Each ✓ is a record received. Click it to see the readings and open the PDF (you need to be signed in to your Google account for the PDF). Use **Download as Excel (CSV)** for a list.
- The PDFs are in your Drive, folder **EMT Practical Submissions**, one folder per batch. The Sheet's **Submissions** tab has one row per trainee per practical.

## Good to know

- The PDF is the printed record: name, readings, result. The circuit pictures are left out.
- Anyone with the web app URL can try to send, but they need a valid batch code. Only the trainer key lets anyone read the list. Change a batch code in the Batches tab at any time to lock out old copies.
- If you edit `Code.gs` later, use **Deploy > Manage deployments > Edit > New version** so the change goes live. The URL stays the same.
- Free Google accounts allow about 20,000 script runs a day, far more than a class needs.
