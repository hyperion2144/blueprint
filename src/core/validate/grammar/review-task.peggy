// Review-task grammar — FT items with review_ref (reuses tasks field structure)

ReviewTaskDoc
  = "# Fix Tasks:" __ name:LineRest NEWLINE
    __ body:(FixWaveSection / FixTaskItem / BlankLine / OtherLine)*
    {
      const tasks = [];
      for (const b of body) {
        if (b && b.tasks) tasks.push(...b.tasks);
        else if (b && b.id !== undefined) tasks.push(b);
      }
      return { name, tasks };
    }

FixWaveSection
  = "## Wave " id:Integer ": " title:LineRest NEWLINE tasks:FixTaskItem+
    { return { wave: id, theme: title, tasks }; }

FixTaskItem
  = __ "- [" checkbox:CheckState "] FT-" id:Integer ": [type:" typeName:TypeName "] " title:LineRest NEWLINE
    fields:FixFieldLine+
    {
      const fmap = {};
      for (const f of fields) fmap[f.key] = f.val;
      return { id, type: typeName, title, checked: checkbox === 'x', fields: fmap };
    }

FixFieldLine
  = __ "- **" key:FixFieldKey "**: " val:LineRest NEWLINE
    { return { key, val }; }

FixFieldKey
  = "files" { return "files"; }
  / "review_ref" { return "review_ref"; }
  / "acceptance" { return "acceptance"; }

CheckState
  = " " { return ' '; }
  / "x" { return 'x'; }

TypeName
  = "behavior" / "config" / "refactor" / "docs" / "scaffolding"

BlankLine
  = NEWLINE

OtherLine
  = __ text:LineRest NEWLINE

Integer
  = digits:[0-9]+ { return parseInt(digits.join("")); }

LineRest
  = chars:[^\n\r]+ { return chars.join("").trim(); }

__
  = [ \t\n\r]*

NEWLINE
  = "\n" / "\r\n" / "\r"
