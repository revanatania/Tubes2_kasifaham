package traversal

import (
	"tubes2/backend/internal/models"
)

const LOG = 18 

type LCATable struct {
	table    [][]int
	depth    []int
	nodeByID []*models.Node 
	size     int
}

func BuildLCA(allNodes []*models.Node) *LCATable {
	n := len(allNodes)
	if n == 0 {
		return &LCATable{}
	}

	t := &LCATable{
		size:     n,
		nodeByID: make([]*models.Node, n),
		depth:    make([]int, n),
		table:    make([][]int, n),
	}

	for _, node := range allNodes {
		if node.ID < n {
			t.nodeByID[node.ID] = node
		}
	}

	for i := range t.table {
		t.table[i] = make([]int, LOG)
		for k := range t.table[i] {
			t.table[i][k] = -1 
		}
	}

	type frame struct{ node *models.Node }
	stack := []frame{}

	for _, node := range allNodes {
		if node.Parent == nil {
			stack = append(stack, frame{node})
			t.depth[node.ID] = 0
			t.table[node.ID][0] = -1 
			break
		}
	}

	for len(stack) > 0 {
		cur := stack[len(stack)-1].node
		stack = stack[:len(stack)-1]

		for _, child := range cur.Children {
			t.depth[child.ID] = t.depth[cur.ID] + 1
			t.table[child.ID][0] = cur.ID
			stack = append(stack, frame{child})
		}
	}

	for k := 1; k < LOG; k++ {
		for v := 0; v < n; v++ {
			anc := t.table[v][k-1]
			if anc == -1 {
				t.table[v][k] = -1
			} else {
				t.table[v][k] = t.table[anc][k-1]
			}
		}
	}

	return t
}

func (t *LCATable) QueryLCA(nodeIDA, nodeIDB int) *models.LCAResult {
	if t == nil || t.size == 0 {
		return nil
	}
	if nodeIDA < 0 || nodeIDA >= t.size || nodeIDB < 0 || nodeIDB >= t.size {
		return nil
	}

	a, b := nodeIDA, nodeIDB
	depthA := t.depth[a]
	depthB := t.depth[b]

	if depthA < depthB {
		a, b = b, a
		depthA, depthB = depthB, depthA
	}
	diff := depthA - depthB
	for k := 0; k < LOG; k++ {
		if (diff>>k)&1 == 1 {
			a = t.table[a][k]
			if a == -1 {
				return nil
			}
		}
	}

	if a == b {
		lcaNode := t.nodeByID[a]
		return &models.LCAResult{
			LCANode:  models.NodeToInfo(lcaNode),
			DepthA:   t.depth[nodeIDA],
			DepthB:   t.depth[nodeIDB],
			DepthLCA: t.depth[a],
			PathToA:  t.pathFromTo(a, nodeIDA),
			PathToB:  t.pathFromTo(a, nodeIDB),
		}
	}

	for k := LOG - 1; k >= 0; k-- {
		if t.table[a][k] != -1 && t.table[a][k] != t.table[b][k] {
			a = t.table[a][k]
			b = t.table[b][k]
		}
	}

	lcaID := t.table[a][0]
	if lcaID == -1 {
		return nil
	}
	lcaNode := t.nodeByID[lcaID]

	return &models.LCAResult{
		LCANode:  models.NodeToInfo(lcaNode),
		DepthA:   t.depth[nodeIDA],
		DepthB:   t.depth[nodeIDB],
		DepthLCA: t.depth[lcaID],
		PathToA:  t.pathFromTo(lcaID, nodeIDA),
		PathToB:  t.pathFromTo(lcaID, nodeIDB),
	}
}

func (t *LCATable) pathFromTo(ancestorID, descendantID int) []int {
	if ancestorID == descendantID {
		return []int{ancestorID}
	}

	path := []int{}
	cur := descendantID
	for cur != ancestorID && cur != -1 {
		path = append(path, cur)
		cur = t.table[cur][0]
	}
	path = append(path, ancestorID)

	for i, j := 0, len(path)-1; i < j; i, j = i+1, j-1 {
		path[i], path[j] = path[j], path[i]
	}
	return path
}

func (t *LCATable) KthAncestor(v, k int) int {
	if t == nil || v < 0 || v >= t.size {
		return -1
	}
	for bit := 0; bit < LOG; bit++ {
		if (k>>bit)&1 == 1 {
			v = t.table[v][bit]
			if v == -1 {
				return -1
			}
		}
	}
	return v
}
