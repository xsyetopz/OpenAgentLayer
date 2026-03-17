---
description: "Detects project code style conventions and injects them as context. Preloaded by @hephaestus."
user-invocable: false
context:
  - command: |
      python3 -c "
      import re, glob, os
      exts = {'py': '**/*.py', 'ts': '**/*.ts', 'js': '**/*.js', 'rs': '**/*.rs', 'go': '**/*.go'}
      files = []
      for ext, pat in exts.items():
          files.extend(glob.glob(pat, recursive=True)[:3])
      if not files:
          print('No source files detected.')
          exit()
      tabs = spaces = snake = camel = pascal = 0
      semicolons = no_semi = single_q = double_q = 0
      for f in files:
          try:
              content = open(f).read()
              tabs += content.count(chr(9))
              spaces += len(re.findall(r'^ {2,}', content, re.M))
              snake += len(re.findall(r'\b[a-z]+_[a-z]+', content))
              camel += len(re.findall(r'\b[a-z]+[A-Z][a-z]+', content))
              pascal += len(re.findall(r'\b[A-Z][a-z]+[A-Z]', content))
              semicolons += content.count(';')
              single_q += content.count(chr(39))
              double_q += content.count(chr(34))
          except: pass
      indent = 'tabs' if tabs > spaces else 'spaces'
      naming = 'snake_case' if snake > camel else 'camelCase'
      quotes = 'single' if single_q > double_q else 'double'
      print(f'Indent: {indent} | Naming: {naming} | Quotes: {quotes}')
      print(f'Languages: {list(set(os.path.splitext(f)[1] for f in files))}')
      print(f'Sample: {\" \".join(files[:5])}')
      "
    label: "Project style conventions"
---

Style conventions detected from the project's source files. Follow these conventions in all code you write.
