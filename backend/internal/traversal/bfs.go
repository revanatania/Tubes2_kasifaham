package traversal

import (
	"sort"
	"sync"

	"tubes2/backend/internal/models"
	"tubes2/backend/internal/parser"
)

type StepCallback func(step models.TraversalStep)

func BFS(
	root *models.Node,
	sel string,
	limit int,
	callback StepCallback,
) (matched []*models.Node, steps []models.TraversalStep, totalVisited int) {
	if root == nil {
		return
	}


	stepCounter := 0
	matchCount := 0
	pathMap := map[int][]int{root.ID: {root.ID}}
	currentLevel := []*models.Node{root}

	for len(currentLevel) > 0 && (limit == 0 || matchCount < limit) {
		type nodeResult struct {
			node    *models.Node
			matched bool
			stepNum int
		}

		results := make([]nodeResult, len(currentLevel))
		var mu sync.Mutex
		var wg sync.WaitGroup

		baseStep := stepCounter
		stepCounter += len(currentLevel)

		for i, node := range currentLevel {
			wg.Add(1)
			go func(idx int, n *models.Node) {
				defer wg.Done()
				isMatch := parser.MatchesSelector(n, sel)
				mu.Lock()
				_ = pathMap[n.ID]
				mu.Unlock()
				results[idx] = nodeResult{node: n, matched: isMatch, stepNum: baseStep + idx}
			}(i, node)
		}
		wg.Wait()

		var nextLevel []*models.Node
		limitReached := false

		for _, r := range results {
			if limitReached {
				break
			}

			totalVisited++
			path := pathMap[r.node.ID]
			step := models.TraversalStep{
				Step:         r.stepNum,
				NodeID:       r.node.ID,
				Tag:          r.node.Tag,
				Depth:        r.node.Depth,
				Matched:      r.matched,
				Algorithm:    "BFS",
				PathFromRoot: path,
			}
			steps = append(steps, step)
			if callback != nil {
				callback(step)
			}

			if r.matched {
				matched = append(matched, r.node)
				matchCount++
				if limit > 0 && matchCount >= limit {
					limitReached = true
					continue
				}
			}

			for _, child := range r.node.Children {
				childPath := make([]int, len(path)+1)
				copy(childPath, path)
				childPath[len(path)] = child.ID
				pathMap[child.ID] = childPath
				nextLevel = append(nextLevel, child)
			}
		}
		currentLevel = nextLevel
	}

	sort.Slice(steps, func(i, j int) bool {
		return steps[i].Step < steps[j].Step
	})

	return
}

func DFS(
	root *models.Node,
	sel string,
	limit int,
	callback StepCallback,
) (matched []*models.Node, steps []models.TraversalStep, totalVisited int) {
	if root == nil {
		return
	}


	stepCounter := 0

	stopped := false

	var visit func(node *models.Node, path []int)
	visit = func(node *models.Node, path []int) {
		if stopped {
			return
		}

		myPath := make([]int, len(path)+1)
		copy(myPath, path)
		myPath[len(path)] = node.ID

		isMatch := parser.MatchesSelector(node, sel)
		step := models.TraversalStep{
			Step:         stepCounter,
			NodeID:       node.ID,
			Tag:          node.Tag,
			Depth:        node.Depth,
			Matched:      isMatch,
			Algorithm:    "DFS",
			PathFromRoot: myPath,
		}
		stepCounter++
		totalVisited++
		steps = append(steps, step)

		if callback != nil {
			callback(step)
		}

		if isMatch {
			matched = append(matched, node)
			if limit > 0 && len(matched) >= limit {
				stopped = true
				return
			}
		}

		for _, child := range node.Children {
			if stopped {
				return
			}
			visit(child, myPath)
		}
	}

	visit(root, []int{})

	return
}