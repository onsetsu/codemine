var cosineSimilarity = require('./../math/utils');

class LDModel {
    documentSimilarityOfAnd(doc1, doc2) {
        return cosineSimilarity(
            this.topicsForDocumentAt(doc1),
            this.topicsForDocumentAt(doc2)
        );
    }

    documentsForTopicAt(topic) {
        return this.perDocumentTopics.atColumn(topic);
    }

    featureSimilarityOfAnd(word1, word2) {
        return cosineSimilarity(
            this.topicsForFeatureAt(word1),
            this.topicsForFeatureAt(word2)
        );
    }

    featuresForTopicAt(topic) {
        return this.perTopicFeatures.atRow(topic);
    }

    initializeTopicsAndDocumentsAndPriors(topics, documents, priors) {
        //console.log(topics);
        this.perTopicFeatures = topics;
        this.perDocumentTopics = documents;
        this.topicPriors = priors;

        return this;
    }

    topicsForDocumentAt(docid) {
        return this.perDocumentTopics.atRow(docid);
    }

    topicsForFeatureAt(word) {
        return this.perTopicFeatures.atColumn(word);
    }
}

module.exports = LDModel;
