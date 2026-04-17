"""
Allergen Normalizer GUI — User-friendly desktop application for parsing restaurant allergen data.

A PySimpleGUI-based interface for the normalizer pipeline. Supports PDF, XLSX, and CSV files.

Usage:
    python gui.py

Requirements:
    pip install PySimpleGUI
"""

import json
import logging
import sys
import threading
from pathlib import Path
from typing import Optional

import PySimpleGUI as sg

from normalizer import parse_file, export_json, export_db, print_summary
from models import Restaurant

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("gui")

# PySimpleGUI theme and configuration
sg.theme("DarkBlue3")
sg.set_options(font=("Segoe UI", 10), button_color=("#FFFFFF", "#0078D4"))

WINDOW_TITLE = "🍽️  Allergen Normalizer — Restaurant Data Parser"
WINDOW_ICON = None  # Set to a .ico file path if you have one


class NormalizerGUI:
    """Main GUI application for the allergen normalizer."""

    def __init__(self):
        self.window = None
        self.parsing = False
        self.last_output_dir = Path("output").absolute()

    def build_layout(self):
        """Build the GUI layout."""
        layout = [
            [sg.Text(WINDOW_TITLE, font=("Segoe UI", 14, "bold"), text_color="#0078D4")],
            [sg.Text("Parse allergen data from PDF, XLSX, or CSV files", text_color="#666666")],
            [sg.Text("_" * 80, text_color="#CCCCCC")],

            # File selection section
            [sg.Text("📄 Input File", font=("Segoe UI", 11, "bold"))],
            [
                sg.Input(key="-FILE-", readonly=True, size=(50, 1)),
                sg.FileBrowse(
                    "Browse",
                    file_types=(
                        ("PDF Files", "*.pdf"),
                        ("Excel Files", "*.xlsx *.xls"),
                        ("CSV Files", "*.csv"),
                        ("All Files", "*.*"),
                    ),
                    target="-FILE-",
                    button_color=("#FFFFFF", "#0078D4"),
                ),
            ],

            # Restaurant name section
            [sg.Text("🏢 Restaurant Name", font=("Segoe UI", 11, "bold"))],
            [sg.Text("(Leave blank to auto-detect from filename)", text_color="#999999", font=("Segoe UI", 9))],
            [
                sg.Input(
                    key="-RESTAURANT-",
                    default_text="",
                    size=(55, 1),
                )
            ],

            # Output directory section
            [sg.Text("📁 Output Directory", font=("Segoe UI", 11, "bold"))],
            [
                sg.Input(key="-OUTPUT-", default_text=str(self.last_output_dir), readonly=True, size=(50, 1)),
                sg.FolderBrowse(
                    "Browse",
                    target="-OUTPUT-",
                    button_color=("#FFFFFF", "#0078D4"),
                ),
            ],

            # Options section
            [sg.Text("⚙️  Options", font=("Segoe UI", 11, "bold"))],
            [
                sg.Checkbox("Interactive Mode (manually map columns)", key="-INTERACTIVE-", default=False),
                sg.Checkbox("Export JSON", key="-JSON-", default=True),
                sg.Checkbox("Export SQLite Database", key="-DB-", default=True),
            ],
            [
                sg.Checkbox("Copy JSON to app/data/ after export", key="-COPY-APP-", default=True),
                sg.Checkbox("Verbose logging", key="-VERBOSE-", default=False),
            ],

            # Separator
            [sg.Text("_" * 80, text_color="#CCCCCC")],

            # Output section
            [sg.Text("📊 Output", font=("Segoe UI", 11, "bold"))],
            [
                sg.Multiline(
                    size=(80, 15),
                    key="-OUTPUT-TEXT-",
                    disabled=True,
                    font=("Courier New", 9),
                    background_color="#1E1E1E",
                    text_color="#00FF00",
                )
            ],

            # Status bar
            [
                sg.Text("Ready", key="-STATUS-", size=(40, 1), text_color="#0078D4"),
                sg.ProgressBar(
                    100,
                    key="-PROGRESS-",
                    size=(20, 15),
                    visible=False,
                    bar_color=("#0078D4", "#E0E0E0"),
                ),
            ],

            # Action buttons
            [
                sg.Button("▶ Parse File", key="-PARSE-", button_color=("#FFFFFF", "#107C10"), size=(15, 2)),
                sg.Button("📋 View Summary", key="-SUMMARY-", disabled=True, size=(15, 2)),
                sg.Button("🔄 Clear Output", key="-CLEAR-", size=(15, 2)),
                sg.Button("❌ Exit", button_color=("#FFFFFF", "#D13438"), size=(15, 2)),
            ],
        ]
        return layout

    def create_window(self):
        """Create and return the main window."""
        self.window = sg.Window(
            WINDOW_TITLE,
            self.build_layout(),
            finalize=True,
            size=(900, 900),
            icon=WINDOW_ICON,
            resizable=True,
        )
        return self.window

    def log_output(self, message: str, level: str = "info"):
        """Append a message to the output text area."""
        output_element = self.window["-OUTPUT-TEXT-"]
        current_text = output_element.get()

        # Add timestamp and level indicator
        prefix = {
            "info": "ℹ️ ",
            "success": "✅ ",
            "warning": "⚠️ ",
            "error": "❌ ",
        }.get(level, "• ")

        new_text = current_text + f"{prefix}{message}\n"
        output_element.update(new_text)

        # Auto-scroll to bottom
        output_element.widget.see(sg.tk.END)

    def parse_file_threaded(self, file_path: Path, restaurant_name: Optional[str],
                            output_dir: Path, interactive: bool,
                            export_json_flag: bool, export_db_flag: bool,
                            copy_to_app: bool, verbose: bool):
        """Parse file in a separate thread to prevent UI freezing."""
        try:
            self.log_output(f"Starting parse: {file_path.name}", "info")

            if verbose:
                logging.getLogger().setLevel(logging.DEBUG)
            else:
                logging.getLogger().setLevel(logging.INFO)

            # Parse the file
            if not interactive:
                self.log_output(f"Parsing {file_path.suffix.upper()} file...", "info")

            dishes = parse_file(file_path, interactive=interactive)

            if not dishes:
                self.log_output("No dishes extracted from file", "warning")
                self.window["-STATUS-"].update("⚠️  No data extracted", text_color="#FFB900")
                return

            # Create restaurant object
            from normalizer import _name_from_path
            restaurant_name_final = restaurant_name or _name_from_path(file_path)
            restaurant = Restaurant(
                name=restaurant_name_final,
                source_file=file_path.name,
                dishes=dishes,
            )

            self.log_output(f"✓ Extracted {len(dishes)} dishes", "success")

            # Prepare output paths
            output_dir_path = Path(output_dir).resolve()
            output_dir_path.mkdir(parents=True, exist_ok=True)
            self.last_output_dir = output_dir_path

            # Export JSON
            if export_json_flag:
                json_name = f"{restaurant_name_final.lower().replace(' ', '_')}.json"
                json_path = output_dir_path / json_name
                self.log_output(f"Writing JSON: {json_path.name}...", "info")
                export_json(restaurant, json_path)
                self.log_output(f"✓ JSON saved: {json_path.name}", "success")

                # Copy to app if requested
                if copy_to_app:
                    app_data_dir = Path(__file__).parent.parent / "app" / "data"
                    if app_data_dir.exists():
                        app_json_path = app_data_dir / json_name
                        import shutil
                        shutil.copy(json_path, app_json_path)
                        self.log_output(f"✓ Copied to app/data/{json_name}", "success")
                    else:
                        self.log_output(f"⚠️  app/data/ directory not found, skipping copy", "warning")

            # Export SQLite
            if export_db_flag:
                db_name = f"{restaurant_name_final.lower().replace(' ', '_')}.db"
                db_path = output_dir_path / db_name
                self.log_output(f"Writing SQLite DB: {db_name}...", "info")
                export_db(restaurant, db_path)
                self.log_output(f"✓ Database saved: {db_name}", "success")

            # Print summary
            self.log_output("", "info")
            self.log_output("=" * 60, "info")
            self.log_output(f"{restaurant_name_final}  —  {len(dishes)} dishes", "success")
            self.log_output("=" * 60, "info")

            # Top allergens
            from collections import Counter
            from models import AllergenType
            contains_counter: Counter = Counter()
            may_counter: Counter = Counter()

            for dish in restaurant.dishes:
                for a in dish.allergens:
                    if a.presence_type == AllergenType.CONTAINS:
                        contains_counter[a.allergen_name_en] += 1
                    else:
                        may_counter[a.allergen_name_en] += 1

            self.log_output("", "info")
            self.log_output("Top 'Contains' allergens:", "info")
            for allergen, count in contains_counter.most_common(5):
                self.log_output(f"  {allergen:<25} {count:>4} dishes", "info")

            self.log_output("", "info")
            self.log_output("Top 'May contain' allergens:", "info")
            for allergen, count in may_counter.most_common(5):
                self.log_output(f"  {allergen:<25} {count:>4} dishes", "info")

            self.log_output("", "info")
            self.log_output("✅ Parse completed successfully!", "success")
            self.window["-STATUS-"].update("✅ Parse completed", text_color="#107C10")
            self.window["-SUMMARY-"].update(disabled=False)

        except Exception as exc:
            logger.error("Parse failed: %s", exc, exc_info=True)
            self.log_output(f"Error: {str(exc)}", "error")
            self.window["-STATUS-"].update("❌ Parse failed", text_color="#D13438")

        finally:
            self.parsing = False
            self.window["-PARSE-"].update(disabled=False)
            self.window["-PROGRESS-"].update(visible=False)

    def run(self):
        """Run the GUI event loop."""
        self.create_window()

        self.log_output("🎯 Allergen Normalizer Ready", "success")
        self.log_output("Select a file and click 'Parse File' to begin", "info")

        while True:
            event, values = self.window.read()

            if event == sg.WINDOW_CLOSED or event == "-EXIT-":
                break

            if event == "-CLEAR-":
                self.window["-OUTPUT-TEXT-"].update("")
                self.window["-STATUS-"].update("Ready", text_color="#0078D4")
                self.window["-SUMMARY-"].update(disabled=True)

            if event == "-PARSE-":
                file_path = values["-FILE-"]
                if not file_path:
                    sg.popup_error("Please select a file first", title="No File Selected")
                    continue

                file_path = Path(file_path)
                if not file_path.exists():
                    sg.popup_error(f"File not found: {file_path}", title="File Not Found")
                    continue

                if self.parsing:
                    sg.popup_warning("A parse is already in progress", title="Already Parsing")
                    continue

                # Get options
                restaurant_name = values["-RESTAURANT-"].strip() or None
                output_dir = values["-OUTPUT-"]
                interactive = values["-INTERACTIVE-"]
                export_json_flag = values["-JSON-"]
                export_db_flag = values["-DB-"]
                copy_to_app = values["-COPY-APP-"]
                verbose = values["-VERBOSE-"]

                # Validate
                if not export_json_flag and not export_db_flag:
                    sg.popup_error("Select at least one export format (JSON or SQLite)",
                                 title="No Export Selected")
                    continue

                # Clear output and start parsing
                self.window["-OUTPUT-TEXT-"].update("")
                self.window["-PARSE-"].update(disabled=True)
                self.window["-PROGRESS-"].update(visible=True)
                self.window["-STATUS-"].update("⏳ Parsing...", text_color="#FFB900")
                self.window["-SUMMARY-"].update(disabled=True)
                self.parsing = True

                # Start parse in separate thread
                thread = threading.Thread(
                    target=self.parse_file_threaded,
                    args=(
                        file_path,
                        restaurant_name,
                        output_dir,
                        interactive,
                        export_json_flag,
                        export_db_flag,
                        copy_to_app,
                        verbose,
                    ),
                    daemon=True,
                )
                thread.start()

            if event == "-SUMMARY-":
                sg.popup_ok(
                    "Parse completed successfully!\n\n"
                    "✓ Check the output above for details\n"
                    "✓ Files exported to the output directory\n"
                    "✓ JSON copied to app/data/ if enabled",
                    title="Parse Summary",
                )

        self.window.close()


def main():
    """Entry point for the GUI application."""
    app = NormalizerGUI()
    app.run()


if __name__ == "__main__":
    main()
