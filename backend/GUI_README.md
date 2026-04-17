# 🍽️ Allergen Normalizer GUI

A user-friendly desktop application for parsing restaurant allergen data from PDF, XLSX, and CSV files.

## Features

✨ **Easy to Use**
- Point-and-click file selection
- Real-time parsing feedback
- Live output log with color-coded messages

🚀 **Powerful**
- Parse PDF, XLSX, CSV formats
- Auto-detect restaurant name from filename
- Export to JSON and SQLite simultaneously
- Interactive mode for custom column mapping
- Auto-copy to app directory

⚙️ **Flexible**
- Configurable output directory
- Optional JSON/Database export
- Verbose logging mode
- Direct integration with app/data/

## Installation

### Prerequisites
- Python 3.8+
- All packages in `requirements.txt`

### Quick Start (Windows)

1. **Double-click `launch_gui.bat`**

   That's it! The launcher will:
   - Check Python installation
   - Install/update dependencies automatically
   - Launch the GUI

2. **Or use command line:**
   ```bash
   cd backend
   python launch_gui.py
   ```

### Quick Start (macOS/Linux)

```bash
cd backend
pip install -r requirements.txt
python launch_gui.py
```

## How to Use

### Step 1: Select Input File
Click the **Browse** button next to "Input File" and select:
- `📄 PDF files` — Restaurant allergen tables (e.g., H3 menu)
- `📊 XLSX/XLS files` — Excel spreadsheets
- `📋 CSV files` — Comma-separated data

### Step 2: Configure (Optional)

**Restaurant Name** (optional)
- Auto-detected from filename if left blank
- Example: `tabela_alergenios_h3.pdf` → `H3`

**Output Directory** (optional)
- Defaults to `backend/output/`
- Click Browse to change

**Options**
- ✅ **Interactive Mode** — Manually map columns (for non-standard formats)
- ✅ **Export JSON** — Create normalized JSON file (recommended)
- ✅ **Export SQLite Database** — Create database file for queries
- ✅ **Copy JSON to app/data/** — Auto-copy result to app (recommended)
- ✅ **Verbose Logging** — Detailed debug output

### Step 3: Parse

Click **▶ Parse File** and wait for completion.

The output log will show:
- ✅ Extraction progress
- ✅ Dish count
- ✅ Top allergens found
- ✅ Export confirmation
- ✅ Copy status

### Step 4: Review

The summary shows:
- Total dishes extracted
- Top "Contains" allergens
- Top "May contain" allergens
- Files created

## Output Files

### Automatic Files
- `h3.json` — Normalized allergen data (same structure as `app/data/h3.json`)
- `h3.db` — SQLite database for queries

### Auto-Copied Files (if enabled)
- `app/data/h3.json` — Ready to use in the app!

## Interactive Mode

For non-standard file formats, enable **Interactive Mode**:

1. Click the Interactive Mode checkbox
2. Click **Parse File**
3. A wizard will appear asking you to map columns:
   - Which column = dish name?
   - Which column = category?
   - Which column = contains allergens?
   - etc.

This is useful for custom restaurant files with unusual layouts.

## Troubleshooting

### "Python is not installed"
- Install Python from [python.org](https://python.org)
- Make sure to check "Add Python to PATH" during installation

### "No dishes extracted"
- Check that the file format is correct
- Verify the file is not corrupted
- Try enabling **Interactive Mode** to manually map columns

### "Module not found" errors
- Run: `pip install -r requirements.txt`
- Or just use `launch_gui.bat` (it handles this automatically)

### GUI doesn't start
- Make sure you're in the `backend/` directory
- Check that `gui.py` and `launch_gui.py` exist
- Run with verbose: `python launch_gui.py -v` (if applicable)

## Advanced Usage

### Command Line (if you prefer)
```bash
python normalizer.py tables-test/tabela_alergenios_h3.pdf \
    --restaurant-name "H3" \
    --output-dir output/
```

### Batch Processing
Run the GUI multiple times for different files:
1. Parse H3 PDF
2. Parse Vira PDF
3. Parse McDonald's PDF
4. All results auto-copied to `app/data/`

## File Format Support

### PDF (Recommended)
- Restaurant allergen tables
- Supports: pdfplumber-compatible PDFs
- Example: `tabela_alergenios_h3.pdf`

### XLSX/XLS
- Excel spreadsheets
- Auto-detects headers
- Useful for custom data entry

### CSV
- Comma or tab-separated values
- Requires headers in first row
- Good for data imports

## What Gets Generated

```
backend/output/
├── h3.json              ← Normalized allergen data
├── h3.db                ← SQLite database
├── vira.json
├── vira.db
└── ...

app/data/
├── h3.json              ← Auto-copied from output/
├── vira.json
└── ...
```

## Next Steps

After parsing:

1. **Verify in App** — Open the Expo app and navigate to the restaurant
   - Check that allergens display correctly
   - Verify dish names and categories

2. **Check Database** — Query the SQLite database:
   ```bash
   sqlite3 backend/output/h3.db
   > SELECT * FROM dishes WHERE name LIKE '%Benedict%';
   ```

3. **Edit Manually** — If needed, edit `app/data/h3.json` directly

4. **Version Control** — Commit the normalized files:
   ```bash
   git add backend/output/ app/data/
   git commit -m "Update H3 allergen data"
   ```

## Support

For issues or feature requests:
1. Check the logs in the GUI output area
2. Enable **Verbose Logging** for more details
3. Review the console output if running from command line

## Architecture

```
PDF/XLSX/CSV (source)
    ↓
normalizer.py (parser)
    ↓
Restaurant object
    ↓
export_json() → h3.json
export_db()   → h3.db
    ↓
GUI: Copy to app/data/h3.json
    ↓
App uses the data
```

---

**Made with ❤️ for food safety.**
