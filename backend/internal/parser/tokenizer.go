package parser

import (
	"strings"
)


type tokenType int

const (
	tokenOpenTag   tokenType = iota 
	tokenCloseTag                   
	tokenSelfClose                  
	tokenDoctype                    
	tokenComment                   
	tokenText                       
)

type token struct {
	typ   tokenType
	tag   string           
	attrs map[string]string 
	raw   string           
}

func tokenize(rawHTML string) []token {
	var tokens []token
	i := 0
	n := len(rawHTML)

	for i < n {
		if rawHTML[i] != '<' {
			j := strings.Index(rawHTML[i:], "<")
			if j < 0 {
				j = n - i
			}
			text := strings.TrimSpace(rawHTML[i : i+j])
			if text != "" {
				tokens = append(tokens, token{typ: tokenText, raw: text})
			}
			i += j
			continue
		}

		end := findTagEnd(rawHTML, i)
		if end < 0 {
			break
		}
		tagContent := rawHTML[i+1 : end] 
		i = end + 1

		if strings.HasPrefix(tagContent, "!--") {
			tokens = append(tokens, token{typ: tokenComment})
			continue
		}

		if strings.HasPrefix(strings.ToUpper(tagContent), "!DOCTYPE") {
			tokens = append(tokens, token{typ: tokenDoctype})
			continue
		}

		if strings.HasPrefix(tagContent, "/") {
			tagName := strings.ToLower(strings.TrimSpace(tagContent[1:]))
			if idx := strings.IndexAny(tagName, " \t\n\r"); idx >= 0 {
				tagName = tagName[:idx]
			}
			tokens = append(tokens, token{typ: tokenCloseTag, tag: tagName})
			continue
		}

		isSelfClose := strings.HasSuffix(tagContent, "/")
		if isSelfClose {
			tagContent = tagContent[:len(tagContent)-1]
		}

		tagName, attrs := parseTagContent(tagContent)
		if tagName == "" {
			continue
		}

		if isVoidElement(tagName) {
			tokens = append(tokens, token{
				typ:   tokenSelfClose,
				tag:   tagName,
				attrs: attrs,
			})
			continue
		}

		if isSelfClose {
			tokens = append(tokens, token{
				typ:   tokenSelfClose,
				tag:   tagName,
				attrs: attrs,
			})
		} else {
			tokens = append(tokens, token{
				typ:   tokenOpenTag,
				tag:   tagName,
				attrs: attrs,
			})
		}
	}

	return tokens
}

func findTagEnd(s string, start int) int {
	n := len(s)
	if start+3 < n && s[start:start+4] == "<!--" {
		idx := strings.Index(s[start+4:], "-->")
		if idx < 0 {
			return -1
		}
		return start + 4 + idx + 2 
	}

	i := start + 1
	for i < n {
		c := s[i]
		if c == '"' || c == '\'' {
			i++
			for i < n && s[i] != c {
				i++
			}
		} else if c == '>' {
			return i
		}
		i++
	}
	return -1
}

func parseTagContent(content string) (string, map[string]string) {
	content = strings.TrimSpace(content)
	if content == "" {
		return "", nil
	}

	nameEnd := strings.IndexAny(content, " \t\n\r")
	var tagName string
	var rest string
	if nameEnd < 0 {
		tagName = strings.ToLower(content)
		rest = ""
	} else {
		tagName = strings.ToLower(content[:nameEnd])
		rest = content[nameEnd:]
	}

	if tagName == "" {
		return "", nil
	}

	attrs := parseAttributes(rest)
	return tagName, attrs
}

func parseAttributes(s string) map[string]string {
	attrs := make(map[string]string)
	s = strings.TrimSpace(s)
	i := 0
	n := len(s)

	for i < n {
		for i < n && isSpace(s[i]) {
			i++
		}
		if i >= n {
			break
		}

		j := i
		for j < n && s[j] != '=' && !isSpace(s[j]) {
			j++
		}
		if j == i {
			i++
			continue
		}
		key := strings.ToLower(strings.TrimSpace(s[i:j]))
		i = j

		for i < n && isSpace(s[i]) {
			i++
		}

		if i >= n || s[i] != '=' {
			if key != "" {
				attrs[key] = ""
			}
			continue
		}
		i++ 

		for i < n && isSpace(s[i]) {
			i++
		}
		if i >= n {
			break
		}

		var val string
		if s[i] == '"' || s[i] == '\'' {
			quote := s[i]
			i++
			start := i
			for i < n && s[i] != quote {
				i++
			}
			val = s[start:i]
			if i < n {
				i++ 
			}
		} else {
			start := i
			for i < n && !isSpace(s[i]) {
				i++
			}
			val = s[start:i]
		}

		if key != "" {
			attrs[key] = val
		}
	}

	return attrs
}

func isSpace(c byte) bool {
	return c == ' ' || c == '\t' || c == '\n' || c == '\r'
}

func isVoidElement(tag string) bool {
	switch tag {
	case "area", "base", "br", "col", "embed", "hr", "img", "input",
		"link", "meta", "param", "source", "track", "wbr":
		return true
	}
	return false
}