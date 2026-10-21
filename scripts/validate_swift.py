"""Syntax-only Linux validation. This does NOT compile or type-check SwiftUI."""
from pathlib import Path
import sys
import tree_sitter_swift
from tree_sitter import Language, Parser
import yaml

root = Path(__file__).resolve().parents[1]
parser = Parser(Language(tree_sitter_swift.language()))
failed = []
files = [*root.joinpath('App').glob('*.swift'), *root.joinpath('Tests').glob('*.swift')]
for path in files:
    tree = parser.parse(path.read_bytes())
    if tree.root_node.has_error:
        failed.append(str(path.relative_to(root)))
config = yaml.safe_load(root.joinpath('project.yml').read_text())
assert config['options']['deploymentTarget']['iOS'] == '26.0'
assert config['targets']['Xpres']['type'] == 'application'
assert config['targets']['XpresTests']['dependencies'] == [{'target': 'Xpres'}]
if failed:
    print('Syntax errors:', ', '.join(failed))
    sys.exit(1)
print(f'Parsed {len(files)} Swift files and XcodeGen configuration; no Apple SDK type checking performed.')
