import os
from pathlib import Path

def print_paths():
    print("from __file__:", os.path.dirname(os.path.abspath(__file__)))
    print("from Path:", str(Path(__file__).resolve().parent))
    print("cwd:", os.getcwd())

if __name__ == "__main__":
    print_paths()
