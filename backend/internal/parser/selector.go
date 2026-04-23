package parser

import (
	"strings"

	"tubes2/backend/internal/models"
)

type attrSel struct {
	attr string
	op   string
	val  string
}

type simpleSel struct {
	tag   string
	class string
	id    string
	univ  bool
	attrs []attrSel
}

type compound struct {
	parts       []simpleSel
	combinators []rune
}

func ParseSelector(sel string) []compound {
	var result []compound
	for _, part := range strings.Split(sel, ",") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		if c, ok := parseCompound(part); ok {
			result = append(result, c)
		}
	}
	return result
}

func parseCompound(sel string) (compound, bool) {
	var parts []simpleSel
	var combinators []rune

	tokens, combs := tokenizeSelector(sel)
	for _, t := range tokens {
		s, ok := parseSimple(t)
		if !ok {
			return compound{}, false
		}
		parts = append(parts, s)
	}
	combinators = combs

	if len(parts) == 0 {
		return compound{}, false
	}
	return compound{parts: parts, combinators: combinators}, true
}

func tokenizeSelector(sel string) ([]string, []rune) {
	var tokens []string
	var combs []rune

	sel = strings.TrimSpace(sel)
	i := 0
	n := len(sel)

	for i < n {
		for i < n && sel[i] == ' ' {
			i++
		}
		if i >= n {
			break
		}

		if sel[i] == '>' || sel[i] == '+' || sel[i] == '~' {
			if len(tokens) > 0 {
				combs = append(combs, rune(sel[i]))
			}
			i++
			continue
		}

		j := i
		for j < n {
			if sel[j] == '[' {
				j++
				for j < n && sel[j] != ']' {
					j++
				}
				if j < n {
					j++ 
				}
			} else if sel[j] == ' ' || sel[j] == '>' || sel[j] == '+' || sel[j] == '~' {
				break
			} else {
				j++
			}
		}

		token := sel[i:j]
		if token != "" {
			if len(tokens) > 0 && len(combs) < len(tokens) {
				combs = append(combs, ' ')
			}
			tokens = append(tokens, token)
		}
		i = j
	}
	return tokens, combs
}

func parseSimple(s string) (simpleSel, bool) {
	if s == "" {
		return simpleSel{}, false
	}
	if s == "*" {
		return simpleSel{univ: true}, true
	}

	var ss simpleSel
	i := 0
	n := len(s)

	j := i
	for j < n && s[j] != '.' && s[j] != '#' && s[j] != '[' {
		j++
	}
	ss.tag = strings.ToLower(s[i:j])
	i = j

	for i < n {
		switch s[i] {
		case '.':
			i++
			j = i
			for j < n && s[j] != '.' && s[j] != '#' && s[j] != '[' {
				j++
			}
			ss.class = s[i:j]
			i = j

		case '#':
			i++
			j = i
			for j < n && s[j] != '.' && s[j] != '#' && s[j] != '[' {
				j++
			}
			ss.id = s[i:j]
			i = j

		case '[':
			i++ 
			j = i
			for j < n && s[j] != ']' {
				j++
			}
			attrExpr := s[i:j]
			if j < n {
				i = j + 1 
			} else {
				i = j
			}
			a := parseAttrSel(attrExpr)
			ss.attrs = append(ss.attrs, a)

		default:
			i++
		}
	}

	return ss, true
}

func parseAttrSel(expr string) attrSel {
	expr = strings.TrimSpace(expr)

	ops := []string{"^=", "$=", "*=", "~=", "|=", "="}
	for _, op := range ops {
		idx := strings.Index(expr, op)
		if idx >= 0 {
			attr := strings.TrimSpace(expr[:idx])
			val := strings.TrimSpace(expr[idx+len(op):])

			val = strings.Trim(val, `"'`)
			return attrSel{attr: strings.ToLower(attr), op: op, val: val}
		}
	}

	return attrSel{attr: strings.ToLower(strings.TrimSpace(expr)), op: ""}
}

func Matches(node *models.Node, selectorStr string) bool {
	compounds := ParseSelector(selectorStr)
	for _, c := range compounds {
		if matchCompound(node, c) {
			return true
		}
	}
	return false
}

func matchCompound(node *models.Node, c compound) bool {
	n := len(c.parts)
	if n == 0 {
		return false
	}
	if !matchSimple(node, c.parts[n-1]) {
		return false
	}
	if n == 1 {
		return true
	}
	return matchLeft(node, c, n-2)
}

func matchLeft(current *models.Node, c compound, idx int) bool {
	if idx < 0 {
		return true
	}
	comb := c.combinators[idx]
	target := c.parts[idx]

	switch comb {
	case '>':
		if current.Parent == nil {
			return false
		}
		if !matchSimple(current.Parent, target) {
			return false
		}
		return matchLeft(current.Parent, c, idx-1)

	case ' ':
		ancestor := current.Parent
		for ancestor != nil {
			if matchSimple(ancestor, target) {
				if matchLeft(ancestor, c, idx-1) {
					return true
				}
			}
			ancestor = ancestor.Parent
		}
		return false

	case '+':
		prev := prevElementSibling(current)
		if prev == nil {
			return false
		}
		if !matchSimple(prev, target) {
			return false
		}
		return matchLeft(prev, c, idx-1)

	case '~':
		if current.Parent == nil {
			return false
		}
		for _, sib := range current.Parent.Children {
			if sib == current {
				break
			}
			if matchSimple(sib, target) {
				if matchLeft(sib, c, idx-1) {
					return true
				}
			}
		}
		return false
	}
	return false
}

func matchSimple(node *models.Node, s simpleSel) bool {
	if node == nil {
		return false
	}
	if s.univ {
		return true
	}
	if s.tag != "" && node.Tag != s.tag {
		return false
	}
	if s.class != "" {
		classAttr, ok := node.Attributes["class"]
		if !ok {
			return false
		}
		found := false
		for _, cls := range strings.Fields(classAttr) {
			if cls == s.class {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	// Cek id
	if s.id != "" {
		if node.Attributes["id"] != s.id {
			return false
		}
	}
	for _, a := range s.attrs {
		if !matchAttr(node, a) {
			return false
		}
	}
	return true
}

func matchAttr(node *models.Node, a attrSel) bool {
	val, exists := node.Attributes[a.attr]
	if !exists {
		return false
	}
	switch a.op {
	case "":
		return true
	case "=":
		return val == a.val
	case "^=":
		return strings.HasPrefix(val, a.val)
	case "$=":
		return strings.HasSuffix(val, a.val)
	case "*=":
		return strings.Contains(val, a.val)
	case "~=":
		for _, word := range strings.Fields(val) {
			if word == a.val {
				return true
			}
		}
		return false
	case "|=":
		return val == a.val || strings.HasPrefix(val, a.val+"-")
	}
	return false
}

func prevElementSibling(node *models.Node) *models.Node {
	if node.Parent == nil || node.SiblingIndex == 0 {
		return nil
	}
	return node.Parent.Children[node.SiblingIndex-1]
}
