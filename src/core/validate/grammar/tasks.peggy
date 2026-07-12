// Tasks grammar — T items with refs to DS, types, spec_ref

Tasks
  = "# Tasks:" __ name:LineRest NEWLINE
    __ body:(WaveSection / TaskItem / BlankLine / OtherLine)* __ (.)* { 
      const tasks = [];
      for (const b of body) {
        if (b && b.tasks) tasks.push(...b.tasks);
        else if (b && b.id !== undefined) tasks.push(b);
      }
      return { name, tasks }; 
    }

WaveSection
  = "## Wave " id:Integer ": " title:LineRest NEWLINE tasks:TaskItem*
    { return { wave: id, theme: title, tasks }; }

TaskItem
  = __ "- [" checkbox:CheckState "] T-" id:Integer ": [type:" typeName:TypeName "] " title:LineRest NEWLINE
    fields:FieldLine*
    { 
      const fmap = {};
      for (const f of fields) fmap[f.key] = f.val;
      return { id, type: typeName, title, checked: checkbox === 'x', fields: fmap }; 
    }

FieldLine
  = __ "- **" key:FieldKey "**: " val:LineRest NEWLINE
    { return { key, val }; }

FieldKey
  = "refs" { return "refs"; }
  / "files" { return "files"; }
  / "spec_ref" { return "spec_ref"; }
  / "acceptance" { return "acceptance"; }
  / "depends_on" { return "depends_on"; }
  / "description" { return "description"; }

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

_ = [ 	]*
__
  = [ \t\n\r]*

NEWLINE
  = "\n" / "\r\n" / "\r"
