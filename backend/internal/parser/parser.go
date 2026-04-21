package parser

import (
	"strings"

	"tubes2/backend/internal/models"
)

type idCounter struct{ val int }

func (c *idCounter) next() int {
	id := c.val
	c.val++
	return id
}

func Parse(rawHTML string) (root *models.Node, allNodes []*models.Node, err error) {
	tokens := tokenize(rawHTML)
	if len(tokens) == 0 {
		return nil, nil, nil
	}

	c := &idCounter{}
	var nodes []*models.Node

	virtualRoot := &models.Node{ID: -1, Tag: "__root__"}
	stack := []*models.Node{virtualRoot}
	childCount := map[*models.Node]int{}

	for _, tok := range tokens {
		switch tok.typ {

		case tokenComment, tokenDoctype, tokenText:
			continue

		case tokenOpenTag:
			parent := stack[len(stack)-1]
			node := &models.Node{
				ID:           c.next(),
				Tag:          tok.tag,
				Attributes:   tok.attrs,
				Parent:       parent,
				SiblingIndex: childCount[parent],
			}
			if parent != virtualRoot {
				parent.Children = append(parent.Children, node)
			}
			childCount[parent]++
			nodes = append(nodes, node)
			stack = append(stack, node)

		case tokenSelfClose:
			parent := stack[len(stack)-1]
			node := &models.Node{
				ID:           c.next(),
				Tag:          tok.tag,
				Attributes:   tok.attrs,
				Parent:       parent,
				SiblingIndex: childCount[parent],
			}
			if parent != virtualRoot {
				parent.Children = append(parent.Children, node)
			}
			childCount[parent]++
			nodes = append(nodes, node)

		case tokenCloseTag:
			for i := len(stack) - 1; i > 0; i-- {
				if stack[i].Tag == tok.tag {
					stack = stack[:i]
					break
				}
			}
		}
	}

	if len(virtualRoot.Children) == 0 {
		if len(nodes) > 0 {
			fixTree(nodes[0], nil, 0)
			return nodes[0], nodes, nil
		}
		return nil, nil, nil
	}

	root = virtualRoot.Children[0]

	fixTree(root, nil, 0)

	return root, nodes, nil
}
func fixTree(node *models.Node, parent *models.Node, depth int) {
	if node == nil {
		return
	}
	node.Parent = parent
	node.Depth = depth
	for _, child := range node.Children {
		fixTree(child, node, depth+1)
	}
}

func MaxDepth(root *models.Node) int {
	if root == nil {
		return 0
	}
	max := root.Depth
	for _, child := range root.Children {
		if d := MaxDepth(child); d > max {
			max = d
		}
	}
	return max
}

func MatchesSelector(node *models.Node, sel string) bool {
	return Matches(node, sel)
}

func NormalizeHTML(s string) string {
	return strings.TrimSpace(s)
}