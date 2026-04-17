# Quick Start: Allergen Normalizer GUI

## 🚀 Fastest Way to Get Started

### Windows (Easiest)
1. Open `backend/` folder
2. **Double-click `launch_gui.bat`**
3. Wait for the GUI window to appear
4. Done! Start using it immediately

### macOS/Linux
1. Open terminal in `backend/` folder
2. Run: `bash launch_gui.sh`
3. Or: `python3 launch_gui.py`

---

## 📖 Basic Workflow

### 1️⃣ Select PDF
- Click **Browse** next to "Input File"
- Choose your restaurant PDF (e.g., `tabela_alergenios_h3.pdf`)

### 2️⃣ Configure (Optional)
- **Restaurant Name**: Leave blank to auto-detect
- **Output Directory**: Leave as default (`output/`)
- **Options**: Keep defaults (JSON + SQLite + Copy to App)

### 3️⃣ Click Parse
- Click **▶ Parse File** button
- Watch the output log for progress
- ✅ Green = Success, ⚠️ Yellow = Warnings, ❌ Red = Errors

### 4️⃣ Done!
- JSON automatically copied to `app/data/`
- App is ready to use the new data

---

## 🎯 Common Tasks

### Parse H3 Menu
```
1. Click Browse
2. Select: backend/tables-test/tabela_alergenios_h3.pdf
3. Restaurant Name: (leave blank - auto-detects as "H3")
4. Click Parse
5. Wait 5-10 seconds
6. ✅ Done!
```

### Parse Custom File
```
1. Click Browse
2. Select your XLSX or CSV file
3. Enter Restaurant Name
4. If columns don't match:
   - Check "Interactive Mode"
   - Click Parse (wizard will guide you)
5. Done!
```

### Update App With New Data
```
1. Parse the file (see above)
2. Ensure "Copy JSON to app/data/" is checked
3. JSON is auto-copied!
4. App uses the new data immediately
```

---

## ⚙️ What the Options Mean

| Option | What It Does | Default |
|--------|-------------|---------|
| **Interactive Mode** | Manually map columns (for weird formats) | ❌ Off |
| **Export JSON** | Create `.json` file | ✅ On |
| **Export SQLite** | Create `.db` database | ✅ On |
| **Copy to app/data/** | Auto-sync with app | ✅ On |
| **Verbose Logging** | Show debug details | ❌ Off |

**Recommendation**: Keep defaults! They work for normal files.

---

## 📊 What Gets Created

After parsing a file named `tabela_alergenios_h3.pdf`:

```
backend/output/
├── h3.json          ← Allergen data (parsed from PDF)
└── h3.db            ← Database version

app/data/
└── h3.json          ← Auto-copied here!
```

The app uses `app/data/h3.json` to show allergen warnings.

---

## 🔍 Output Explanation

### Green ✅
```
✓ Extracted 42 dishes
✓ JSON saved: h3.json
✓ Database saved: h3.db
✓ Copied to app/data/h3.json
```
Perfect! Everything worked.

### Yellow ⚠️
```
⚠️ app/data/ directory not found, skipping copy
```
Parser worked but couldn't copy. Manual copy needed.

### Red ❌
```
❌ Error: No dishes extracted from file
```
File format wrong, corrupted, or columns don't match.
Try **Interactive Mode** to manually map.

---

## 🆘 Troubleshooting

### "Python is not installed"
- Download Python from [python.org](https://python.org)
- During install, **check "Add Python to PATH"**
- Restart your computer
- Try again

### "No dishes extracted"
**Try:**
1. Enable **Interactive Mode**
2. Click Parse
3. Follow the wizard to map columns

**Or:**
1. Verify file format is correct
2. Check file isn't corrupted
3. Use command line: `python normalizer.py <file>`

### GUI won't start
1. Open terminal/command prompt
2. Run: `python launch_gui.py`
3. Check error message
4. Or: Re-run `launch_gui.bat` (dependency installer)

### Where are my files?
- Default location: `backend/output/`
- Change in GUI: "Output Directory" field
- Or check what you set in the GUI

---

## 📚 Next Steps

After successfully parsing:

### 1. **Verify in App**
```bash
cd app
npm start
# Navigate to H3 restaurant
# Check that allergens show correctly
```

### 2. **Version Control**
```bash
git add app/data/h3.json
git commit -m "Update: H3 allergen data"
```

### 3. **Parse Other Restaurants**
```
1. Repeat for Vira PDF
2. Repeat for McDonald's PDF
3. All synced to app automatically!
```

---

## 🎓 Learn More

- **Full Guide**: Read `GUI_README.md`
- **PDF Format Help**: Check `BACKEND.md` (if exists)
- **Code**: See `gui.py` and `normalizer.py`

---

## 💡 Pro Tips

### Batch Processing
Parse multiple restaurants one after another:
1. H3 PDF → ▶ Parse → Wait ✅
2. Vira PDF → ▶ Parse → Wait ✅
3. McDonald's → ▶ Parse → Wait ✅
4. All synced to app!

### Interactive Wizard
For non-standard files:
1. Check "Interactive Mode"
2. Click Parse
3. GUI asks you to map columns
4. Works with any spreadsheet

### Database Queries
After export, query the SQLite database:
```bash
sqlite3 backend/output/h3.db
sqlite> SELECT * FROM dishes WHERE name LIKE '%Benedict%';
sqlite> .tables
```

---

## 🎯 Success Checklist

After using the GUI:

- [ ] File was selected
- [ ] No red error messages
- [ ] Output shows "dishes extracted"
- [ ] JSON file created in `output/`
- [ ] JSON copied to `app/data/`
- [ ] App shows new allergen data

---

**That's it! You're ready to go. Questions? Check `GUI_README.md` for details.**

🍽️ Happy parsing!
