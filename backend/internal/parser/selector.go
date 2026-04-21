package parser

import (
	"strings"

	"tubes2/backend/internal/models"
)

type simpleSel struct {
	tag   string 
	class string 
	id    string 
	univ  bool   
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
		for j < n && sel[j] != ' ' && sel[j] != '>' && sel[j] != '+' && sel[j] != '~' {
			j++
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
	for j < n && s[j] != '.' && s[j] != '#' {
		j++
	}
	ss.tag = strings.ToLower(s[i:j])
	i = j

	for i < n {
		if s[i] == '.' { 
			i++
			j = i
			for j < n && s[j] != '.' && s[j] != '#' {
				j++
			}
			ss.class = s[i:j]
			i = j
		} else if s[i] == '#' {
			i++
			j = i
			for j < n && s[j] != '.' && s[j] != '#' {
				j++
			}
			ss.id = s[i:j]
			i = j
		} else {
			break
		}
	}

	return ss, true
}

// return true kalau node cocok dengan salah satu selector dlm slice, entry point utama
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

//  menguji node cocok dengan satu simple selector atau tidak
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
	return true
}

func prevElementSibling(node *models.Node) *models.Node {
	if node.Parent == nil || node.SiblingIndex == 0 {
		return nil
	}
	return node.Parent.Children[node.SiblingIndex-1]
}