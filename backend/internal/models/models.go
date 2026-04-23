package models

type Node struct {
	ID           int               `json:"id"`
	Tag          string            `json:"tag"`
	Attributes   map[string]string `json:"attributes"`
	Children     []*Node           `json:"children"`
	Parent       *Node             `json:"-"`
	Depth        int               `json:"depth"`
	SiblingIndex int               `json:"siblingIndex"`
	TextContent  string            `json:"textContent,omitempty"`
}

type TraversalStep struct {
	Step         int    `json:"step"`
	NodeID       int    `json:"nodeId"`
	Tag          string `json:"tag"`
	Depth        int    `json:"depth"`
	Matched      bool   `json:"matched"`
	Algorithm    string `json:"algorithm"`
	PathFromRoot []int  `json:"pathFromRoot"`
}

type TraversalResult struct {
	Algorithm    string          `json:"algorithm"`
	Selector     string          `json:"selector"`
	MatchedNodes []*Node         `json:"matchedNodes"`
	TotalVisited int             `json:"totalVisited"`
	ElapsedMs    float64         `json:"elapsedMs"`
	MaxDepth     int             `json:"maxDepth"`
	Steps        []TraversalStep `json:"steps"`
	TreeJSON     *Node           `json:"treeJson"`
}

type LCARequest struct {
	NodeIDA int `json:"nodeIdA"`
	NodeIDB int `json:"nodeIdB"`
}

type LCAResult struct {
	LCANode  *NodeInfo `json:"lcaNode"`
	DepthA   int       `json:"depthA"`
	DepthB   int       `json:"depthB"`
	DepthLCA int       `json:"depthLca"`
	PathToA  []int     `json:"pathToA"`
	PathToB  []int     `json:"pathToB"`
}

type NodeInfo struct {
	ID         int               `json:"id"`
	Tag        string            `json:"tag"`
	Attributes map[string]string `json:"attributes"`
	Depth      int               `json:"depth"`
}

type TraverseRequest struct {
	URL       string `json:"url"`
	RawHTML   string `json:"rawHtml"`
	Algorithm string `json:"algorithm"`
	Selector  string `json:"selector"`
	Limit     int    `json:"limit"`
}

type SSEEvent struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

func NodeToInfo(n *Node) *NodeInfo {
	if n == nil {
		return nil
	}
	return &NodeInfo{
		ID:         n.ID,
		Tag:        n.Tag,
		Attributes: n.Attributes,
		Depth:      n.Depth,
	}
}
