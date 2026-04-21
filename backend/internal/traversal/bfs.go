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
				parentPath := pathMap[n.ID]
				_ = parentPath 
				mu.Unlock()

				results[idx] = nodeResult{
					node:    n,
					matched: isMatch,
					stepNum: baseStep + idx,
				}
			}(i, node)
		}
		wg.Wait()

		var nextLevel []*models.Node

		for _, r := range results {
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
					break
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
	rootPath := []int{root.ID}
	rootMatched := parser.MatchesSelector(root, sel)
	rootStep := models.TraversalStep{
		Step:         0,
		NodeID:       root.ID,
		Tag:          root.Tag,
		Depth:        root.Depth,
		Matched:      rootMatched,
		Algorithm:    "DFS",
		PathFromRoot: rootPath,
	}
	steps = append(steps, rootStep)
	totalVisited++
	if callback != nil {
		callback(rootStep)
	}
	if rootMatched {
		matched = append(matched, root)
		if limit > 0 && len(matched) >= limit {
			return
		}
	}

	if len(root.Children) == 0 {
		return
	}
	type subtreeResult struct {
		childIdx int
		matched  []*models.Node
		steps    []models.TraversalStep
		visited  int
	}

	resultsCh := make(chan subtreeResult, len(root.Children))
	var wg sync.WaitGroup

	for i, child := range root.Children {
		wg.Add(1)
		go func(idx int, subtreeRoot *models.Node) {
			defer wg.Done()
			sm, ss, sv := dfsSubtree(subtreeRoot, rootPath, sel, 1, limit)
			resultsCh <- subtreeResult{
				childIdx: idx,
				matched:  sm,
				steps:    ss,
				visited:  sv,
			}
		}(i, child)
	}

	wg.Wait()
	close(resultsCh)
	allResults := make([]subtreeResult, 0, len(root.Children))
	for r := range resultsCh {
		allResults = append(allResults, r)
	}

	sort.Slice(allResults, func(i, j int) bool {
		return allResults[i].childIdx < allResults[j].childIdx
	})

	globalStep := 1
	for _, r := range allResults {
		totalVisited += r.visited
		for _, s := range r.steps {
			s.Step = globalStep
			globalStep++
			steps = append(steps, s)
			if callback != nil {
				callback(s)
			}
		}
		if limit == 0 || len(matched) < limit {
			for _, m := range r.matched {
				if limit == 0 || len(matched) < limit {
					matched = append(matched, m)
				}
			}
		}
	}

	return
}

func dfsSubtree(
	node *models.Node,
	parentPath []int,
	sel string,
	startStep int,
	limit int,
) (matched []*models.Node, steps []models.TraversalStep, totalVisited int) {
	if node == nil {
		return
	}

	myPath := make([]int, len(parentPath)+1)
	copy(myPath, parentPath)
	myPath[len(parentPath)] = node.ID

	isMatch := parser.MatchesSelector(node, sel)
	step := models.TraversalStep{
		Step:         startStep,
		NodeID:       node.ID,
		Tag:          node.Tag,
		Depth:        node.Depth,
		Matched:      isMatch,
		Algorithm:    "DFS",
		PathFromRoot: myPath,
	}
	steps = append(steps, step)
	totalVisited++

	if isMatch {
		matched = append(matched, node)
		if limit > 0 && len(matched) >= limit {
			return
		}
	}

	localStep := startStep + 1
	for _, child := range node.Children {
		cm, cs, cv := dfsSubtree(child, myPath, sel, localStep, limit)
		totalVisited += cv
		steps = append(steps, cs...)
		if limit == 0 || len(matched) < limit {
			for _, m := range cm {
				if limit == 0 || len(matched) < limit {
					matched = append(matched, m)
				}
			}
		}
		localStep += cv
	}
	return
}